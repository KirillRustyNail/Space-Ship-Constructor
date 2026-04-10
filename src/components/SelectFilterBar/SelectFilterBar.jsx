import React from 'react';
import './SelectFilterBar.css';

const SelectFilterBar = ({ config, setConfig }) => {
  const toggle = (key) => setConfig(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="select-filter-bar">
      <div className="filter-label">Фильтр:</div>
      <button className={config.blocks ? 'active' : ''} onClick={() => toggle('blocks')}>Блоки</button>
      <button className={config.hulls ? 'active' : ''} onClick={() => toggle('hulls')}>Корпус</button>
      <button className={config.walls ? 'active' : ''} onClick={() => toggle('walls')}>Стены</button>
      <button className={config.doors ? 'active' : ''} onClick={() => toggle('doors')}>Двери</button>
    </div>
  );
};

export default SelectFilterBar;
