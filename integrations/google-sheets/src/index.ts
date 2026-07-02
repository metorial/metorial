import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchUpdate,
  clearCells,
  createChart,
  createFilterView,
  createPivotTable,
  createSpreadsheet,
  deleteSpreadsheet,
  formatCells,
  getSpreadsheet,
  manageNamedRanges,
  manageProtectedRanges,
  manageSheets,
  mergeCells,
  readCells,
  setDataValidation,
  updateSpreadsheet,
  writeCells
} from './tools';
import { spreadsheetChanged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createSpreadsheet,
    getSpreadsheet,
    updateSpreadsheet,
    deleteSpreadsheet,
    readCells,
    writeCells,
    clearCells,
    manageSheets,
    formatCells,
    batchUpdate,
    createChart,
    createPivotTable,
    setDataValidation,
    manageProtectedRanges,
    manageNamedRanges,
    createFilterView,
    mergeCells
  ],
  triggers: [spreadsheetChanged]
});
