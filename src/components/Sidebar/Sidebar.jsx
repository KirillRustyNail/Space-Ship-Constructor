import React from 'react';
import { MODES, BLOCK_TEMPLATES } from '../../constants';
import './Sidebar.css';

const Sidebar = ({ mode, setMode, selected, setSelected }) => {
  const filteredTemplates = BLOCK_TEMPLATES.filter(t => {
    if (mode === MODES.DOOR) return t.type === 'door';
    return t.type === 'block';
  });

  return (
    <div className="sidebar">
      <h3 style={{ margin: 0 }}>ENGINEERING</h3>
      <div className="modes">
        <button className={mode === MODES.ADD ? 'active' : ''} onClick={() => setMode(MODES.ADD)}>ADD (2)</button>
        <button className={mode === MODES.DELETE ? 'active' : ''} onClick={() => setMode(MODES.DELETE)}>DEL (3)</button>
        <button className={mode === MODES.HULL ? 'active' : ''} onClick={() => setMode(MODES.HULL)}>HULL (4)</button>
        <button className={mode === MODES.EDIT ? 'active' : ''} onClick={() => setMode(MODES.EDIT)}>EDIT (5)</button>
        <button className={mode === MODES.SUB_HULL ? 'active' : ''} onClick={() => setMode(MODES.SUB_HULL)}>SUB_HULL (6)</button>
        <button className={mode === MODES.WALL ? 'active' : ''} onClick={() => setMode(MODES.WALL)}>WALL (7)</button>
        <button className={mode === MODES.DOOR ? 'active' : ''} onClick={() => setMode(MODES.DOOR)}>DOOR (8)</button>
      </div>
      
      <h4 style={{ margin: '10px 0 5px 0', fontSize: '12px', color: '#666' }}>
        {mode === MODES.DOOR ? 'DOORS' : 'EQUIPMENT'}
      </h4>
      <div className="templates-container">
        {filteredTemplates.map(t => (
          <div 
            key={t.id} 
            className={`item ${selected.id === t.id ? 'sel' : ''}`} 
            onClick={() => setSelected(t)}
          >
            <img src={t.svgUrl} alt={t.name} />
            <span style={{ textAlign: 'center', lineHeight: '1.1' }}>{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
