import { Slate } from 'slates';
import { spec } from './spec';
import {
  addWebsiteTool,
  exportDataTool,
  exportFileTool,
  getEventsTool,
  getStatisticsTool,
  listWebsitesTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getStatisticsTool,
    getEventsTool,
    exportDataTool,
    exportFileTool,
    listWebsitesTool,
    addWebsiteTool
  ],
  triggers: []
});
