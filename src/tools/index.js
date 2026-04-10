import SelectTool from './SelectTool';
import DeleteTool from './DeleteTool';
import { MODES } from '../constants';

const DummyTool = {
  onMouseDown: () => {},
  onMouseMove: () => {},
  onMouseUp: () => {}
};

export const getTool = (mode) => {
  switch (mode) {
    case MODES.SELECT: return SelectTool;
    case MODES.DELETE: return DeleteTool;
    default: return null; // Return null to use legacy logic in Editor for now
  }
};
