import './map.css';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';

var classNames = require('classnames');

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { MapContainer, TileLayer, CircleMarker, GeoJSON, Popup, useMap, useMapEvents } from 'react-leaflet'

import MarkerClusterGroup from 'react-leaflet-markercluster';
import "leaflet.markercluster/dist/MarkerCluster.css";

import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import "leaflet-geosearch/dist/geosearch.css";

import { interpolateViridis } from "d3-scale-chromatic"

import 'bootstrap/dist/css/bootstrap.css';

import '@fortawesome/fontawesome-free/css/fontawesome.css'
import '@fortawesome/fontawesome-free/css/solid.css'


const states = {
	LOADING: "loading",
	LOADED: "loaded",
	ERROR: "error",
}


function Settings({setFilter}) {
  return (
    <div className="input-group">
      <div className="input-group-prepend">
        <div className="input-group-text">Filter</div>
      </div>
      <input className="form-control" type="text" placeholder="example: amenity=*" onChange={event => setFilter(event.target.value)} />
    </div>
  )
}

function Actions({state, setState}) {
  let busy = state == states.LOADING;
  return (
    <a id="download" className={classNames("btn", "btn-primary", {"disabled": busy})} role="button" onClick={_ => setState(states.LOADING)}>
      <i className="fas fa-sync-alt" />
      <span>Show data</span>
      <span className={classNames("spinner-border", "spinner-border-sm", {"d-none": !busy})} role="status"></span>
      <span className="visually-hidden">Loading...</span>
    </a>
  )
}

function ButtonCheckbox({id, children, mode, setMode}) {
  let checked = id == mode;
  return (
    <>
      <input type="radio" className="btn-check" name="modes" id={id} autoComplete="off" checked={checked} onChange={(e) => setMode(e.target.id) } />
      <label className="btn btn-outline-primary" htmlFor={id}>
        {children}
      </label>
    </>
  )
}

function Mode({mode, setMode}) {
  return (
    <div id="mode" className="btn-group-vertical btn-group-toggle" role="group">
      <ButtonCheckbox id="creation" mode={mode} setMode={setMode}>
        <i className="fas fa-fast-backward" /> First edit
      </ButtonCheckbox>
      <ButtonCheckbox id="lastedit" mode={mode} setMode={setMode}>
        <i className="fas fa-fast-forward" /> Last edit
      </ButtonCheckbox>
      <ButtonCheckbox id="revisions" mode={mode} setMode={setMode}>
        <i className="fas fa-clone" /> Revisions
      </ButtonCheckbox>
      <ButtonCheckbox id="frequency" mode={mode} setMode={setMode}>
        <i className="fas fa-stopwatch" /> Update frequency
      </ButtonCheckbox>
    </div>
  )
}

function Percentile({percentile, setPercentile}) {
  return (
    <>
      <div className="input-group pt-3">
        <span className="input-group-text">Show the</span>
        <input type="number" className="form-control" min="1" max="100" step="1" value={percentile} onChange={(e) => {setPercentile(e.target.value)} } />
        <span className="input-group-text">percentile</span>
      </div>
      <p className="form-text">
        When grouping nodes, leave out the lowest {percentile}&nbsp;% and show the node after.
      </p>
    </>
  )
}

function Statistics() {
  return (
    <table className="table table-striped">
      <tbody>
        <tr>
          <th scope="row">Worst node</th>
          <td><button className="btn btn-link p-0" id="worstnode"></button></td>
        </tr>
      </tbody>
    </table>
  )
}

function Save() {
  return (
    <a id="download" className="btn btn-primary disabled" role="button">
      <i className="fas fa-arrow-alt-circle-down"></i>
      <span>Download</span>
    </a>
  )
}

function AccordionItem({title, children}) {
  const [collapse, setCollapse] = useState(false);
  return (
    <>
    <h2 className="accordion-header" id="section-settings-heading">
      <button className={classNames('accordion-button', {'collapsed': collapse})} type="button" onClick={()=> setCollapse(!collapse)}>
         {title}
      </button>
    </h2>
    <div className={classNames('accordion-collapse', 'collapse', {'show': !collapse})}>
      <div className="accordion-body">
        {children}
      </div>
    </div>
    </>
  )
}

function Bar({state, setState, setFilter, mode, setMode, percentile, setPercentile}) {
  return (
    <div id="bar" className="bg-light accordion">
      <AccordionItem title="Settings">
        <Settings setFilter={setFilter} />
      </AccordionItem>
      <AccordionItem title="Actions">
        <Actions state={state} setState={setState} />
      </AccordionItem>
      <AccordionItem title="Criteria">
        <Mode mode={mode} setMode={setMode} />
        <Percentile percentile={percentile} setPercentile={setPercentile} />
      </AccordionItem>
      <AccordionItem title="Statistics"><Statistics /></AccordionItem>
      <AccordionItem title="Save">
        <Save state={state} />
      </AccordionItem>
    </div>
  )
}

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

/*
function MyComponent({state, setState, mode, percentile}) {
  const map = useMap();
  console.log(percentile);
  let rectangle = L.layerGroup();
  nodes.addTo(map);
  rectangle.addTo(map);


}
*/

function updateBounds(map, setBounds) {
  let center = map.getCenter();
  let lat = center.lat.toFixed(5);
  let lng = center.lng.toFixed(5);
  let zoom = map.getZoom();
  document.location.hash = `${zoom}/${lat}/${lng}`;

  let bounds = map.getBounds();
  setBounds({
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth()
  });
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

let custom_attribution = `<a href="https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date">${document.title}</a> (<a href="https://github.com/frafra/is-osm-uptodate">source code</a> | &copy; <a href="https://ohsome.org/copyrights">OpenStreetMap contributors</a>)`
function Map(props) {
  const [zoom, lon, lat] = document.location.hash.substr(1).split('/');
  const [colormap, worstPretty, bestPretty] = useMemo(() => {
    let colormap = {};
    let worst = modes[props.mode].defaultValue;
    let best = modes[props.mode].defaultValue;
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
    }
    let worstPretty = modes[props.mode].prettyValue(worst);
    let bestPretty = modes[props.mode].prettyValue(best);
    return [colormap, worstPretty, bestPretty];
  }, [props.geojson, props.mode]);

  //https://github.com/yuzhva/react-leaflet-markercluster/pull/162
  const iconCreateFn = useMemo(() => {
    return iconCreateFunction.bind(null, props.percentile, colormap);
  }, [props.percentile, colormap]);

  // https://github.com/PaulLeCam/react-leaflet/issues/332
  const geojson_key = useMemo(() => {
    return Math.random();
  }, [props.geojson, props.mode]);

  const divRef = useRef(null);
  useEffect(() => {
    if (divRef.current) L.DomEvent.disableClickPropagation(divRef.current);
  });

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
        attribution={custom_attribution} url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        maxZoom={19}
       />
      <GetBounds setBounds={props.setBounds} />
      <MarkerClusterGroup iconCreateFunction={iconCreateFn} spiderfyOnMaxZoom={false} disableClusteringAtZoom={19}>
        {props.geojson && <GeoJSON key={geojson_key} data={props.geojson} pointToLayer={pointToLayer} /> }
      </MarkerClusterGroup>
      <div className="leaflet-top leaflet-right" ref={divRef}>
        <div className="leaflet-control leaflet-bar" id="info">
          <div className="bar">
            <span>{worstPretty}</span>
            <span className="colors"></span>
            <span>{bestPretty}</span>
          </div>
          <div className="slider">
            Background colour
            <input type="range" id="grayscale" defaultValue="0" onChange={setColor}/>
          </div>
        </div>
      </div>
    </MapContainer>
  )
}

/*
              let markers = parseData(data, mode, percentile);
              rectangle.remove();
              rectangle = L.rectangle(map.getBounds(), {
                color: "#ff7800", fill: false, weight: 3
              });
              nodes.clearLayers();
              nodes.addLayers(markers);
              setState(states.LOADED);
*/

function App() {
  const [state, setState] = useState(states.LOADED);
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState("lastedit");
  const [percentile, setPercentile] = useState(50);
  const [bounds, setBounds] = useState();
  const [geojson, setGeojson] = useState(null);
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
      switch (state) {
        case states.LOADING:
          let url = `/api/getData?minx=${bounds.west}&miny=${bounds.south}&maxx=${bounds.east}&maxy=${bounds.north}`;
          if (filter.trim().length > 0) url += `&filter=${filter}`;
          fetch(url)
            .then(response => response.json())
            .then(geojson => {
              setGeojson(geojson);
              setState(states.LOADED);
            })
            .catch(error => {
              console.log(error);
              setState(states.ERROR);
          });
          break;
        case states.LOADED:
          break;
      }
      return null;
  }, [state]);

  return (
    <>
      <Bar state={state} setState={setState} setFilter={setFilter} mode={mode} setMode={setMode} percentile={percentile} setPercentile={setPercentile} />
      <Map state={state} setState={setState} mode={mode} percentile={percentile} setBounds={setBounds} geojson={geojson} />
    </>
  );
}
ReactDOM.render(<App />, document.getElementById('root'));


/*

let autoopen = false;
document.getElementById('worstnode').onclick = function () {
  nodes.addTo(map);
  autoopen=true;
  map.on('zoomend', function() {
   if (autoopen) {
     window.nodeMarker.openPopup();
     autoopen=false;
     }
  });
  map.flyTo(window.nodeMarker._latlng, OpenStreetMapLayer.options.maxZoom);
}


*/
