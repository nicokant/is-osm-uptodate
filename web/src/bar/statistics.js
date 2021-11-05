import React from 'react';

import {maxZoom} from '../constants.js';

function flyAndOpen(marker, event) {
  let map = marker.map;
  map.once('moveend zoomend', _ => marker.openPopup());
  map.flyTo(marker._latlng, maxZoom);
}

function Statistics({statistics}) {
  return (
    <table className="table table-striped">
      <tbody>
        {Object.keys(statistics).map(key =>
        <tr key={key}>
          <th scope="row">{ statistics[key].label }</th>
          <td>
            <button className="btn btn-link p-0" onClick={flyAndOpen.bind(null, statistics[key].marker)}>
              { statistics[key].osmid }
            </button>
          </td>
        </tr>)
        }
      </tbody>
    </table>
  )
}

export default Statistics;
