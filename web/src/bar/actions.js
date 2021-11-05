import React from 'react';
var classNames = require('classnames');
import {states} from '../constants.js';

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

export default Actions;
