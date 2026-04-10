import React, { useState, useEffect } from 'react';
import Editor from '../../components/Editor/Editor';
import Sidebar from '../../components/Sidebar/Sidebar';
import DeleteToolBar from '../DeleteToolBar/DeleteToolBar';
import Toolbar from '../../components/Toolbar/Toolbar';
import SelectFilterBar from '../../components/SelectFilterBar/SelectFilterBar';
import HUD from '../../components/HUD/HUD';
import { useEditorLogic } from '../../hooks/useEditorLogic';
import { MODES, BLOCK_TEMPLATES, MAX_HISTORY } from '../../constants';
import './App.css';

const App = () => {
  const logic = useEditorLogic();
  const [mode, setInternalMode] = useState(MODES.ADD);
  const [selectedTemplate, setSelectedTemplate] = useState(BLOCK_TEMPLATES[0]);
  
  const setMode = (m) => {
    setInternalMode(m);
    if (m === MODES.DOOR) {
      const firstDoor = BLOCK_TEMPLATES.find(t => t.type === 'door');
      if (firstDoor) setSelectedTemplate(firstDoor);
    } else if (m === MODES.ADD) {
      const firstBlock = BLOCK_TEMPLATES.find(t => t.type === 'block');
      if (firstBlock) setSelectedTemplate(firstBlock);
    }
  };
  
  // State
  const [blocks, setBlocks] = useState([]);
  const [hulls, setHulls] = useState([]);
  const [walls, setWalls] = useState([]); // [{id, nodes: [{x, y}]}]
  const [doors, setDoors] = useState([]);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionConfig, setSelectionConfig] = useState({
    blocks: true, hulls: true, walls: true, doors: true
  });

   const [deleteConfig, setDeleteConfig] = useState({
    blocks: true, hulls: true, walls: true, doors: true
  });

  // History
  const [history, setHistory] = useState([{ blocks: [], hulls: [], walls: [], doors: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveToHistory = (newBlocks, newHulls, newWalls, newDoors) => {
    const nextState = { 
      blocks: JSON.parse(JSON.stringify(newBlocks !== undefined ? newBlocks : blocks)), 
      hulls: JSON.parse(JSON.stringify(newHulls !== undefined ? newHulls : hulls)),
      walls: JSON.parse(JSON.stringify(newWalls !== undefined ? newWalls : walls)),
      doors: JSON.parse(JSON.stringify(newDoors !== undefined ? newDoors : doors))
    };
    
    const currentState = history[historyIndex];
    if (currentState) {
      const currentSerialized = JSON.stringify(currentState);
      const nextSerialized = JSON.stringify(nextState);
      if (currentSerialized === nextSerialized) return;
    }
    // Slice history up to the current point, discarding redo history
    let newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nextState);

    if (newHistory.length > MAX_HISTORY + 1) {
      newHistory = newHistory.slice(newHistory.length - 11);
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = React.useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setBlocks(prevState.blocks);
      setHulls(prevState.hulls);
      setWalls(prevState.walls);
      setDoors(prevState.doors || []);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, history]);

  const redo = React.useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setBlocks(nextState.blocks);
      setHulls(nextState.hulls);
      setWalls(nextState.walls);
      setDoors(nextState.doors || []);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history]);

  useEffect(() => {
    const handleKeys = (e) => {
      // Modes
      if (e.key === '2') setMode(MODES.ADD);
      if (e.key === '3') setMode(MODES.DELETE);
      if (e.key === '4') setMode(MODES.HULL);
      if (e.key === '5') setMode(MODES.EDIT); 
      if (e.key === '6') setMode(MODES.SUB_HULL); 
      if (e.key === '7') setMode(MODES.WALL); 
      if (e.key === '8') setMode(MODES.DOOR);
      
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
  }, [undo, redo]);

  return (
    <div className="app-root">
      <div className="sidebar-container">
        <Toolbar mode={mode} setMode={setMode} />
        {(mode === MODES.ADD || mode === MODES.DOOR) && (
          <Sidebar 
            mode={mode} 
            selected={selectedTemplate} 
            setSelected={setSelectedTemplate} 
          />
        )}
      </div>

      <div className="main-area">
        {mode === MODES.DELETE && (
          <DeleteToolBar config={deleteConfig} setConfig={setDeleteConfig} />
        )}
        {mode === MODES.SELECT && (
           <SelectFilterBar config={selectionConfig} setConfig={setSelectionConfig} />
        )}

        <Editor 
          logic={logic} 
          mode={mode} 
          selectedTemplate={selectedTemplate} 
          
          blocks={blocks} setBlocks={setBlocks}
          hulls={hulls} setHulls={setHulls}
          walls={walls} setWalls={setWalls}
          doors={doors} setDoors={setDoors}
          
          selectedIds={selectedIds} setSelectedIds={setSelectedIds}
          selectionConfig={selectionConfig}
          
          saveToHistory={saveToHistory}
          deleteConfig={deleteConfig} 
        />
        <HUD camera={logic.camera} mode={mode} />
      </div>
    </div>
  );
};

export default App;
