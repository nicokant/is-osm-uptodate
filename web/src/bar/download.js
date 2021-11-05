import React from 'react';
var classNames = require('classnames');

function Download({downloadLink}) {
  return (
    <a id="download" className={classNames('btn', 'btn-primary', {'disabled': !downloadLink})} role="button" href={downloadLink}>
      <i className="fas fa-arrow-alt-circle-down"></i>
      <span>Download</span>
    </a>
  )
}

export default Download;
