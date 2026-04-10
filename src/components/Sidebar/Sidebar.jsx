import React from 'react';
import { MODES, BLOCK_TEMPLATES } from '../../constants';
import './Sidebar.css';

const Sidebar = ({ mode, selected, setSelected }) => {
  const filteredTemplates = BLOCK_TEMPLATES.filter(t => {
    if (mode === MODES.DOOR) return t.type === 'door';
    return t.type === 'block'; // По умолчанию показываем блоки, если режим ADD или любой другой
  });

  // Если мы не в режиме добавления или дверей, и список пуст - не рендерим сайдбар, 
  // но лучше проверять режим в родительском компоненте.
  // Здесь просто рендерим список.

  return (
    <div className="sidebar">
      <h3 style={{ margin: 0 }}>БИБЛИОТЕКА</h3>
      
      <h4 style={{ margin: '10px 0 5px 0', fontSize: '12px', color: '#666' }}>
        {mode === MODES.DOOR ? 'ДВЕРИ' : 'ОБОРУДОВАНИЕ'}
      </h4>
      <div className="templates-container">
        {filteredTemplates.map(t => (
          <div 
            key={t.id} 
            className={`item ${selected && selected.id === t.id ? 'sel' : ''}`} 
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
