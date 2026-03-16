import React from 'react';

const DeleteToolBar = ({ config, setConfig }) => {
  const toggle = (key) => setConfig(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="delete-toolbar">
      <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>Delete:</div>
      <button className={config.blocks ? 'active' : ''} onClick={() => toggle('blocks')}>Blocks</button>
      <button className={config.hulls ? 'active' : ''} onClick={() => toggle('hulls')}>Hulls</button>
      <button className={config.walls ? 'active' : ''} onClick={() => toggle('walls')}>Walls</button>
      <button className={config.doors ? 'active' : ''} onClick={() => toggle('doors')}>Doors</button>
    </div>
  );
};

export default DeleteToolBar;