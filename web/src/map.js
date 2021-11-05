import React, { useEffect, useMemo, useRef } from 'react';
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { MapContainer, TileLayer, CircleMarker, GeoJSON, Popup, Rectangle, useMap, useMapEvents } from 'react-leaflet';

import MarkerClusterGroup from 'react-leaflet-markercluster';
import "leaflet.markercluster/dist/MarkerCluster.css";

import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import "leaflet-geosearch/dist/geosearch.css";

import { interpolateViridis } from "d3-scale-chromatic"

import {custom_attribution, tile_url, maxZoom} from './constants.js';

import './map.css';

import 'bootstrap/dist/css/bootstrap.css';

import '@fortawesome/fontawesome-free/css/fontawesome.css'
import '@fortawesome/fontawesome-free/css/solid.css'

let modes = {
    lastedit: {
        defaultValue: (new Date()).getTime(),
        getValue: feature => (new Date(feature.properties.lastedit)).getTime(),
        prettyValue: date => (new Date(date)).toISOString().slice(0, 10),
        inverted: false
    },
    creation: {
        defaultValue: (new Date()).getTime(),
        getValue: feature => (new Date(feature.properties.created)).getTime(),
        prettyValue: date => (new Date(date)).toISOString().slice(0, 10),
        inverted: false
    },
    revisions: {
        defaultValue: 1,
        getValue: feature => feature.properties.version,
        prettyValue: value => value,
        inverted: false
    },
    frequency: {
        defaultValue: 0,
        getValue: feature => feature.properties.average_update_days,
        prettyValue: value => {
          let days = Math.floor(value);
          if (days < 1) return 'daily';
          if (days < 365) return `every ${days} days`;
          let years = Math.floor(value/365);
          return `every ${years} year(s)`;
        },
        inverted: true
    }
};

let colour = 0;
let style = document.createElement('style');
document.head.appendChild(style);
function applyColor() {
  while (style.sheet.cssRules.length) {
    style.sheet.deleteRule(0);
  }
  style.sheet.insertRule(`.leaflet-tile-container { filter: grayscale(${100-colour}%); }`, 0);
}

function setColor(event) {
  colour = event.target.value;
  applyColor();
}

function iconCreateFunction(percentile, colormap, cluster) {
  var markers = cluster.getAllChildMarkers();
  let values = markers.map(marker => colormap[marker.options.fillColor]);
  values.sort(function(a, b) {
    return a - b;
  });
  let aggregated = values[Math.ceil(percentile*values.length/100)-1];
  let html = document.createElement('div');
  html.style.backgroundColor = interpolateViridis(aggregated);
  let content = document.createElement('span');
  content.innerText = markers.length;
  html.appendChild(content);
  return L.divIcon({ html: html, className: "mycluster" });
};

function updateBounds(map, setBounds) {
  let center = map.getCenter();
  let lat = center.lat.toFixed(5);
  let lng = center.lng.toFixed(5);
  let zoom = map.getZoom();
  document.location.hash = `${zoom}/${lat}/${lng}`;

  setBounds(map.getBounds());
}

function GetBounds({setBounds}) {
  const map = useMapEvents({
    'resize': () => updateBounds(map, setBounds),
    'moveend': () => updateBounds(map, setBounds),
    'zoomend': () => updateBounds(map, setBounds)
  });
  return null;
}

function generatePopup(feature) {
  let position = location.hash.substr(1);
  let type = feature.geometry.type == 'Point' ? 'node' : 'way';
  let popup = `
    <b>Last edit</b>: ${feature.properties.lastedit}<br>
    <b>Created at</b>: ${feature.properties.created}<br>
    <b>Current version</b>: ${feature.properties.version}<br>
    <div style="text-align: center">
      <a href="https://www.openstreetmap.org/edit?${type}=${feature.properties.id}#map=${position}" target="_blank">Edit <a> |
      <a href="https://www.openstreetmap.org/${type}/${feature.properties.id}/history" target="_blank">History</a> |
      <a href="https://www.openstreetmap.org/${type}/${feature.properties.id}" target="_blank">Details<a>
    </div>
  `;
  return popup;
}

function pointToLayer(geoJsonPoint, latlng) {
  // https://github.com/PaulLeCam/react-leaflet/issues/234
  let circle = L.circleMarker(latlng, {
      radius: 5,
      fillColor: geoJsonPoint.properties.color,
      color: "#555",
      weight: 1,
      opacity: 1,
      fillOpacity: 1
    });
  circle.osmid = geoJsonPoint.properties.id;
  circle.bindPopup(generatePopup(geoJsonPoint));
  return circle;
}

function setup(map) {
  const search = new GeoSearchControl({
    provider: new OpenStreetMapProvider(),
    showMarker: false,
  });
  map.addControl(search);
  applyColor();
}

function CustomControl({worstPretty, bestPretty, setColor}) {
  const divRef = useRef(null);
  useEffect(() => {
    if (divRef.current) L.DomEvent.disableClickPropagation(divRef.current);
  });

  return (
    <div className="leaflet-top leaflet-right" ref={divRef}>
      <div className="leaflet-control leaflet-bar" id="info">
        <div className="bar">
          <span>{worstPretty}</span>
          <span className="colors"></span>
          <span>{bestPretty}</span>
        </div>
        <div className="slider">
          Background colour
          <input type="range" id="grayscale" defaultValue="0" onChange={setColor} />
        </div>
      </div>
    </div>
  )
}

function CustomGeoJSON({geojson, mode, worstId, bestId, setStatistics}) {
  const geojsonRef = useRef(null);
  const map = useMap();
  useEffect(() => {
    if (geojsonRef.current) {
        let stats = {
          worstNode: {
              label: "Worst node",
              osmid: worstId,
          },
          besttNode: {
              label: "Best node",
              osmid: bestId,
          }
        };
        Object.keys(stats).map(key => {
          stats[key].marker = Object.values(geojsonRef.current._layers).find(layer => layer.osmid == stats[key].osmid)
          stats[key].marker.map = map;
        });
        setStatistics(stats);
    }
  }, [geojson, mode, geojsonRef.current]);

  // https://github.com/PaulLeCam/react-leaflet/issues/332
  const geojson_key = useMemo(() => {
    return Math.random();
  }, [geojson, mode]);
  
  return (
    <GeoJSON key={geojson_key} ref={geojsonRef} data={geojson} pointToLayer={pointToLayer} />
  )
}

function Map(props) {
  let [zoom, lon, lat] = document.location.hash.substr(1).split('/');
  if (!(zoom && lon && lat)) [zoom, lon, lat] = defaultLocation;
  const [colormap, worstId, worstPretty, bestId, bestPretty] = useMemo(() => {
    let colormap = {};
    let worst = modes[props.mode].defaultValue;
    let worstId = null;
    let best = modes[props.mode].defaultValue;
    let bestId = null;
    if (props.geojson) {
      let getValue = modes[props.mode].getValue;
      let values = props.geojson.features.map(feature => getValue(feature));
      let lowest = Math.min(...values);
      let highest = Math.max(...values);
      let inverted = modes[props.mode].inverted;
      worst = !inverted ? lowest : highest;
      best = !inverted ? highest : lowest;
      let range = highest-lowest;
      props.geojson.features.map(feature => {
        let score = Math.abs(worst-getValue(feature))/range;
        let color = interpolateViridis(score);
        feature.properties.color = color;
        colormap[color] = score;
      });
      worstId = props.geojson.features[values.indexOf(worst)].properties.id;
      bestId = props.geojson.features[values.indexOf(best)].properties.id;
    }
    let worstPretty = modes[props.mode].prettyValue(worst);
    let bestPretty = modes[props.mode].prettyValue(best);
    return [colormap, worstId, worstPretty, bestId, bestPretty];
  }, [props.geojson, props.mode]);

  //https://github.com/yuzhva/react-leaflet-markercluster/pull/162
  const iconCreateFn = useMemo(() => {
    return iconCreateFunction.bind(null, props.percentile, colormap);
  }, [props.percentile, colormap]);

  return (
    <MapContainer
      id="map"
      center={[lon, lat]}
      zoom={zoom}
      whenCreated={map => {
        setup(map)
        // https://github.com/PaulLeCam/react-leaflet/issues/46
        map.onload = updateBounds(map, props.setBounds);
      }}>
      <TileLayer
        attribution={custom_attribution} url={tile_url}
        maxZoom={maxZoom}
       />
      <GetBounds setBounds={props.setBounds} />
      { props.boundsLoaded && <Rectangle pathOptions={{color: "#ff7800", fill: false, weight: 3}} bounds={props.boundsLoaded} />}
      <MarkerClusterGroup iconCreateFunction={iconCreateFn} spiderfyOnMaxZoom={false} disableClusteringAtZoom={19}>
        {props.geojson && <CustomGeoJSON geojson={props.geojson} mode={props.mode} worstId={worstId} bestId={bestId} setStatistics={props.setStatistics} /> }
      </MarkerClusterGroup>
      <CustomControl worstPretty={worstPretty} bestPretty={bestPretty} setColor={setColor} />
    </MapContainer>
  )
}

export default Map;
