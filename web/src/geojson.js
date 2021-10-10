import './map.css';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

var classNames = require('classnames');

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

import { MarkerClusterGroup } from "leaflet.markercluster/src";
import "leaflet.markercluster/dist/MarkerCluster.css";

import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import "leaflet-geosearch/dist/geosearch.css";

import { interpolateViridis } from "d3-scale-chromatic"

import 'bootstrap/dist/css/bootstrap.css';

import '@fortawesome/fontawesome-free/css/fontawesome.css'
import '@fortawesome/fontawesome-free/css/solid.css'


function Settings() {
  return (
    <div className="input-group">
      <div className="input-group-prepend">
        <div className="input-group-text">Filter</div>
      </div>
      <input id="filter" className="form-control" type="text" placeholder="example: amenity=*" />
    </div>
  )
}

function Actions() {
  return (
    <a id="download" className="btn btn-primary disabled" role="button" onClick={getData}>
      <i className="fas fa-sync-alt" />
      <span>Show data</span>
      <span id="spinner" className="spinner-border spinner-border-sm d-none" role="status"></span>
      <span className="visually-hidden">Loading...</span>
    </a>
  )
}

function ButtonCheckbox({id, children, mode, onChange}) {
  let checked = id == mode;
  return (
    <>
      <input type="radio" className="btn-check" name="modes" id={id} autoComplete="off" checked={checked} onChange={(e) => onChange(e.target.id) } />
      <label className="btn btn-outline-primary" htmlFor={id}>
        {children}
      </label>
    </>
  )
}

function Mode() {
  const [mode, setMode] = useState("lastedit");
  return (
    <div id="mode" className="btn-group-vertical btn-group-toggle" role="group">
      <ButtonCheckbox id="creation" mode={mode} onChange={mode => setMode(mode)}>
        <i className="fas fa-fast-backward" /> First edit
      </ButtonCheckbox>
      <ButtonCheckbox id="lastedit" mode={mode} onChange={mode => setMode(mode)}>
        <i className="fas fa-fast-forward" /> Last edit
      </ButtonCheckbox>
      <ButtonCheckbox id="revisions" mode={mode} onChange={mode => setMode(mode)}>
        <i className="fas fa-clone" /> Revisions
      </ButtonCheckbox>
      <ButtonCheckbox id="frequency" mode={mode} onChange={mode => setMode(mode)}>
        <i className="fas fa-stopwatch" /> Update frequency
      </ButtonCheckbox>
    </div>
  )
}

function Percentile(props) {
  const [percentile, setPercentile] = useState(50);
  return (
    <>
      <div className="input-group pt-3">
        <span className="input-group-text">Show the</span>
        <input type="number" className="form-control" min="1" max="100" step="1" value={percentile} onChange={(e) => setPercentile(e.target.value) } />
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

function Bar() {
  return (
    <div id="bar" className="bg-light accordion">
      <AccordionItem title="Settings"><Settings /></AccordionItem>
      <AccordionItem title="Actions"><Actions /></AccordionItem>
      <AccordionItem title="Criteria">
        <Mode />
        <Percentile />
      </AccordionItem>
      <AccordionItem title="Statistics"><Statistics /></AccordionItem>
      <AccordionItem title="Save"><Save /></AccordionItem>
    </div>
  )
}

let custom_attribution = `<a href="https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date">${document.title}</a> (<a href="https://github.com/frafra/is-osm-uptodate">source code</a> | &copy; <a href="https://ohsome.org/copyrights">OpenStreetMap contributors</a>)`
function Map() {
  return (
    <MapContainer id="map" center={[45.46423, 9.19073]} zoom={19}>
      <TileLayer
        attribution={custom_attribution} url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
       />
    </MapContainer>
  )
}

function App() {
  return (
    <>
      <Bar />
      <Map />
    </>
  );
}
ReactDOM.render(<App />, document.getElementById('root'));

/*
const search = new GeoSearchControl({
  provider: new OpenStreetMapProvider(),
  showMarker: false,
});
map.addControl(search);

let colour = 0;
let style = document.createElement('style');
document.head.appendChild(style);
map.whenReady(applyColor);
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


let mode = 'lastedit';
let buttonModes = document.querySelectorAll('#mode input');
for (let i=0; i<buttonModes.length; i++) {
  buttonModes[i].onchange = event => {
    mode = event.target.id;
    parseData();
  }
};
let modes = {
    lastedit: {
        defaultValue: new Date(),
        getValue: feature => new Date(feature.properties.lastedit),
        prettyValue: date => date.toISOString().slice(0, 10),
        inverted: false
    },
    creation: {
        defaultValue: new Date(),
        getValue: feature => new Date(feature.properties.created),
        prettyValue: date => date.toISOString().slice(0, 10),
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

let minimumValue = modes[mode].defaultValue;
let maximumValue = modes[mode].defaultValue;

function Info(props) {
  let minimumValuePretty;
  let maximumValuePretty;
  if (!modes[mode].inverted) {
    minimumValuePretty = modes[mode].prettyValue(minimumValue);
    maximumValuePretty = modes[mode].prettyValue(maximumValue);
  } else {
    minimumValuePretty = modes[mode].prettyValue(maximumValue);
    maximumValuePretty = modes[mode].prettyValue(minimumValue);
  }
  return (
    <>
    <div className="bar">
      <span>{minimumValuePretty}</span>
      <span className="colors"></span>
      <span>{maximumValuePretty}</span>
    </div>
    <div className="slider">
      Background colour
      <input type="range" id="grayscale" defaultValue="0" onChange={setColor}/>
    </div>
    </>
  );
}

let info = L.control();
info.onAdd = map => {
  info.div = L.DomUtil.create('div');
  info.div.id = 'info';
  L.DomEvent.disableClickPropagation(info.div);
  return info.div;
};
info.update = message => {
  nodes.refreshClusters();
  ReactDOM.render(<Info />, document.getElementById('info'));
};
info.addTo(map);


let nodes = new MarkerClusterGroup({
    iconCreateFunction: function (cluster) {
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
    },
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 19,
});
let rectangle = L.layerGroup();

nodes.addTo(map);

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

function generatePopup(feature) {
  let type = feature.geometry.type == 'Point' ? 'node' : 'way';
  let popup = `
    <b>Last edit</b>: ${feature.properties.lastedit}<br>
    <b>Created at</b>: ${feature.properties.created}<br>
    <b>Current version</b>: ${feature.properties.version}<br>
    <div style="text-align: center">
      <a href="https://www.openstreetmap.org/edit?${type}=${feature.properties.id}" target="_blank">Edit <a> |
      <a href="https://www.openstreetmap.org/${type}/${feature.properties.id}/history" target="_blank">History</a> |
      <a href="https://www.openstreetmap.org/${type}/${feature.properties.id}" target="_blank">Details<a>
    </div>
  `;
  return popup;
}

let bounds;
function computeUrl() {
  info.update();
  bounds = map.getBounds();
  let west = bounds.getWest();
  let south = bounds.getSouth();
  let east = bounds.getEast();
  let north = bounds.getNorth();
  let url = `/api/getData?minx=${west}&miny=${south}&maxx=${east}&maxy=${north}`;
  let filter = document.getElementById('filter').value;
  if (filter.trim().length > 0) url += `&filter=${filter}`;
  return url;
}
*/
function getData() {
  let spinner = document.getElementById('spinner');
  spinner.classList.remove("d-none");
  download.href = '#';
  download.classList.add("disabled");
  let url = computeUrl();
  fetch(url).then(response => {
    info.update();
    let spinner = document.getElementById('spinner');
    spinner.classList.add("d-none");
    let download = document.getElementById('download');
    let valid_json = response.json();
    download.href = url;
    download.classList.remove("disabled");
    return valid_json;
  }).then(parseData).catch(error => {
    let spinner = document.getElementById('spinner');
    spinner.classList.add("d-none");
    console.log(error);
  });
};
/*
let results;
let colormap = {};
function parseData(data) {
  results = data ? data : results;
  nodes.clearLayers();
  rectangle.remove();
  minimumValue = modes[mode].defaultValue;
  maximumValue = modes[mode].defaultValue;
  let minimumNodeValue = modes[mode].defaultValue;
  let maximumNodeValue = modes[mode].defaultValue;
  let minimumNode;
  let maximumNode;
  let defaultValue = modes[mode].defaultValue;
  for (let index in results.features) {
    let feature = results.features[index];
    let value = modes[mode].getValue(feature);
    if (feature.geometry.type == 'Point') {
      if (value <= minimumNodeValue || minimumNodeValue == defaultValue) {
        minimumNodeValue = value;
        minimumNode = feature;
      }
      if (value > maximumNodeValue || maximumNodeValue == defaultValue) {
        maximumNodeValue = value;
        maximumNode = feature;
      }
    }
    if (value <= minimumValue) {
      minimumValue = value;
    }
    if (value > maximumValue) {
      maximumValue = value;
    }
  }
  // what if there are no features? TODO
  let nodePrettyId;
  if (!modes[mode].inverted) {
    nodePrettyId = minimumNode.properties.id;
  } else {
    nodePrettyId = maximumNode.properties.id;
  }
  document.getElementById("worstnode").innerText = nodePrettyId;
  let range;
  if (modes[mode].inverted) range = minimumValue-maximumValue;
  else range = maximumValue-minimumValue;
  let markers = [];
  colormap = {}; // reset
  L.geoJSON(results, {
    pointToLayer: (feature, latlng) => {
      let value = modes[mode].getValue(feature);
      let computed;
      if (modes[mode].inverted) computed = (value-maximumValue)/range;
      else computed = (value-minimumValue)/range;
      let color = interpolateViridis(computed);
      colormap[color] = computed;
      let marker = L.circleMarker(latlng, {
        radius: 5,
        fillColor: color,
        color: "#555",
        weight: 1,
        opacity: 1,
        fillOpacity: 1
      });
      let popup = generatePopup(feature);
      marker.bindPopup(popup);
      if (!modes[mode].inverted) {
        if (feature.properties.id == minimumNode.properties.id) {
          window.nodeMarker = marker;
        }
      } else {
        if (feature.properties.id == maximumNode.properties.id) {
          window.nodeMarker = marker;
        }
      }
      markers.push(marker);
      return marker;
    }
  });
  rectangle = L.rectangle(bounds, {
    color: "#ff7800", fill: false, weight: 3
  });
  nodes.addLayers(markers);
  rectangle.addTo(map);
  info.update();
}

function updateHash() {
  let center = map.getCenter();
  let lat = center.lat.toFixed(5);
  let lng = center.lng.toFixed(5);
  let zoom = map.getZoom();
  document.location.hash = `${zoom}/${lat}/${lng}`;
};
map.on('zoomend', updateHash);
map.on('moveend', updateHash);

if (document.location.hash) {
  let location = document.location.hash.substr(1).split('/');
  map.setView([location[1], location[2]], location[0])
} else {
  map.setView([45.46423, 9.19073], 19); // Duomo di Milano
}

getData();
*/
