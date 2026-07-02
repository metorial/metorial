import { Slate } from 'slates';
import { spec } from './spec';
import {
  appendValuesTool,
  clearValuesTool,
  copyPasteTool,
  createSpreadsheetTool,
  findReplaceTool,
  formatCellsTool,
  getSpreadsheetTool,
  manageRowsColumnsTool,
  manageSheetsTool,
  mergeCellsTool,
  namedRangesTool,
  protectRangeTool,
  readValuesTool,
  sortRangeTool,
  writeValuesTool
} from './tools';
import { spreadsheetChangedTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createSpreadsheetTool,
    getSpreadsheetTool,
    readValuesTool,
    writeValuesTool,
    appendValuesTool,
    clearValuesTool,
    manageSheetsTool,
    formatCellsTool,
    findReplaceTool,
    manageRowsColumnsTool,
    sortRangeTool,
    mergeCellsTool,
    protectRangeTool,
    namedRangesTool,
    copyPasteTool
  ],
  triggers: [spreadsheetChangedTrigger]
});
