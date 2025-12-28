import React from 'react';
import { MODES, BLOCK_TEMPLATES } from '../../constants';
import './Sidebar.css';

const Sidebar = ({ mode, setMode, selected, setSelected }) => (
  <div className="sidebar">
    <h3>ENGINEERING</h3>
    <div className="modes">
      <button className={mode === MODES.ADD ? 'active' : ''} onClick={() => setMode(MODES.ADD)}>ADD (2)</button>
      <button className={mode === MODES.DELETE ? 'active' : ''} onClick={() => setMode(MODES.DELETE)}>DEL (3)</button>
      <button className={mode === MODES.HULL ? 'active' : ''} onClick={() => setMode(MODES.HULL)}>HULL (4)</button>
      <button className={mode === MODES.EDIT ? 'active' : ''} onClick={() => setMode(MODES.EDIT)}>EDIT (5)</button>
      <button className={mode === MODES.SUB_HULL ? 'active' : ''} onClick={() => setMode(MODES.SUB_HULL)}>SUB_HULL (6)</button>

    </div>
    <div className="templates">
      {BLOCK_TEMPLATES.map(t => (
        <div key={t.id} className={`item ${selected.id === t.id ? 'sel' : ''}`} onClick={() => setSelected(t)}>
          {t.name}
        </div>
      ))}
    </div>
  </div>
);
export default Sidebar;