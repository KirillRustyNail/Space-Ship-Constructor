import React, { useState, useEffect } from 'react';
import Editor from '../../components/Editor/Editor';
import Sidebar from '../../components/Sidebar/Sidebar';
import HUD from '../../components/HUD/HUD';
import { useEditorLogic } from '../../hooks/useEditorLogic';
import { MODES, BLOCK_TEMPLATES, MAX_HISTORY } from '../../constants';
import './App.css';

const App = () => {
  const logic = useEditorLogic();
  const [mode, setMode] = useState(MODES.ADD);
  const [selectedTemplate, setSelectedTemplate] = useState(BLOCK_TEMPLATES[0]);
  
  // State
  const [blocks, setBlocks] = useState([]);
  const [hulls, setHulls] = useState([]);
  
  // History
  const [history, setHistory] = useState([{ blocks: [], hulls: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveToHistory = (newBlocks, newHulls) => {
    const nextState = { blocks: [...newBlocks], hulls: JSON.parse(JSON.stringify(newHulls)) };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nextState);
    
    // Keep only last 10 actions (11 entries total including start state)
    if (newHistory.length > MAX_HISTORY + 1) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setBlocks(prev.blocks);
      setHulls(prev.hulls);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setBlocks(next.blocks);
      setHulls(next.hulls);
      setHistoryIndex(historyIndex + 1);
    }
  };

  useEffect(() => {
    const handleKeys = (e) => {
      // Modes
      if (e.key === '2') setMode(MODES.ADD);
      if (e.key === '3') setMode(MODES.DELETE);
      if (e.key === '4') setMode(MODES.HULL);
      if (e.key === '5') setMode(MODES.EDIT); 
      if (e.key === '6') setMode(MODES.SUB_HULL); 
      
      // Undo/Redo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [historyIndex, history]);

  return (
    <div className="app-root">
      <Sidebar 
        mode={mode} 
        setMode={setMode} 
        selected={selectedTemplate} 
        setSelected={setSelectedTemplate} 
      />
      <div className="main-area">
        <Editor 
          logic={logic} 
          mode={mode} 
          selectedTemplate={selectedTemplate} 
          blocks={blocks} 
          setBlocks={setBlocks}
          hulls={hulls}
          setHulls={setHulls}
          saveToHistory={saveToHistory}
        />
        <HUD camera={logic.camera} mode={mode} />
      </div>
    </div>
  );
};

export default App;
