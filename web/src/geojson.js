import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import {states} from './constants.js';

import Bar from './bar.js';
import Map from './map.js';

import './geojson.css';

function App() {
  const [state, setState] = useState(states.LOADED);
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState("lastedit");
  const [percentile, setPercentile] = useState(50);
  const [bounds, setBounds] = useState();
  const [boundsLoaded, setBoundsLoaded] = useState();
  const [geojson, setGeojson] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [downloadLink, setDownloadLink] = useState();

  useEffect(() => {
      switch (state) {
        case states.LOADING:
          let url = `/api/getData?minx=${bounds.getWest()}&miny=${bounds.getSouth()}&maxx=${bounds.getEast()}&maxy=${bounds.getNorth()}`;
          if (filter.trim().length > 0) url += `&filter=${filter}`;
          fetch(url)
            .then(response => response.json())
            .then(geojson => {
              setGeojson(geojson);
              setDownloadLink(url);
              setState(states.LOADED);
            })
            .catch(error => {
              console.log(error);
              setState(states.ERROR);
          });
          break;
        case states.LOADED:
          setBoundsLoaded(bounds);
          break;
        case states.ERROR:
          setBoundsLoaded();
          setDownloadLink(null); 
      }
      return null;
  }, [state]);

  return (
    <>
      <Bar state={state} setState={setState} setFilter={setFilter} mode={mode} setMode={setMode} percentile={percentile} setPercentile={setPercentile} statistics={statistics} downloadLink={downloadLink} />
      <Map state={state} setState={setState} mode={mode} percentile={percentile} setBounds={setBounds} boundsLoaded={boundsLoaded} geojson={geojson} setStatistics={setStatistics} />
    </>
  );
}
ReactDOM.render(<App />, document.getElementById('root'));

