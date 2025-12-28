import React from 'react';
import { ZOOM_CONFIG } from '../../constants';
import './HUD.css';

const HUD = ({ camera, mode }) => {
  const zoom = Math.round(((camera.scale - ZOOM_CONFIG.MIN) / (ZOOM_CONFIG.MAX - ZOOM_CONFIG.MIN)) * 100);
  return (
    <div className="hud">
      <div className="hud-box">ZOOM: {zoom}%</div>
      <div className="hud-box">MODE: {mode}</div>
    </div>
  );
};
export default HUD;