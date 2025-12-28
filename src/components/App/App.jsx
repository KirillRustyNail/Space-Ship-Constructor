import React, { useState, useEffect } from 'react';
import Editor from '../Editor/Editor';
import Sidebar from '../Sidebar/Sidebar';
import HUD from '../HUD/HUD';
import { useEditorLogic } from '../../hooks/useEditorLogic';
import { MODES, BLOCK_TEMPLATES } from '../../constants';
import './App.css';

const App = () => {
  const logic = useEditorLogic();
  const [mode, setMode] = useState(MODES.ADD);
  const [selectedTemplate, setSelectedTemplate] = useState(BLOCK_TEMPLATES[0]);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const handleKeys = (e) => {
      if (e.key === '2') setMode(MODES.ADD);
      if (e.key === '3') setMode(MODES.DELETE);
      if (e.key === '4') setMode(MODES.HULL);
      if (e.key === '5') setMode(MODES.EDIT); 
      if (e.key === '6') setMode(MODES.SUB_HULL); 
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  return (
    <div className="app-root">
      <Sidebar mode={mode} setMode={setMode} selected={selectedTemplate} setSelected={setSelectedTemplate} />
      <div className="main-area">
        <Editor 
          logic={logic} 
          mode={mode} 
          selectedTemplate={selectedTemplate} 
          blocks={blocks} 
          setBlocks={setBlocks} 
        />
        <HUD camera={logic.camera} mode={mode} />
      </div>
    </div>
  );
};
export default App;