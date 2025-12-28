import { useState, useCallback } from 'react';
import { ZOOM_CONFIG, CELL_SIZE } from '../constants';

export const useEditorLogic = () => {
  const [camera, setCamera] = useState({ x: 200, y: 200, scale: 1 });
  const [anchorPoint, setAnchorPoint] = useState(null);

  const screenToWorld = useCallback((clientX, clientY, rect) => {
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - camera.x) / camera.scale,
      y: (clientY - rect.top - camera.y) / camera.scale
    };
  }, [camera]);

  const handleZoom = (e, containerRef) => {
    const rect = containerRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    const worldX = (localX - camera.x) / camera.scale;
    const worldY = (localY - camera.y) / camera.scale;

    const delta = -e.deltaY * ZOOM_CONFIG.SENSITIVITY;
    const newScale = Math.min(Math.max(camera.scale + delta, ZOOM_CONFIG.MIN), ZOOM_CONFIG.MAX);

    setCamera({
      x: localX - worldX * newScale,
      y: localY - worldY * newScale,
      scale: newScale
    });
  };

  const centerOnAnchor = (rect) => {
    if (!anchorPoint || !rect) return;
    setCamera(prev => ({
      ...prev,
      x: rect.width / 2 - (anchorPoint.x + CELL_SIZE / 2) * prev.scale,
      y: rect.height / 2 - (anchorPoint.y + CELL_SIZE / 2) * prev.scale
    }));
  };

  return { camera, setCamera, anchorPoint, setAnchorPoint, screenToWorld, handleZoom, centerOnAnchor };
};