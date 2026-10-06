import { Slate } from 'slates';
import { spec } from './spec';
import {
  addWebsiteTool,
  exportDataTool,
  getEventsTool,
  getStatisticsTool,
  listWebsitesTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [getStatisticsTool, getEventsTool, exportDataTool, listWebsitesTool, addWebsiteTool],
  triggers: []
});
