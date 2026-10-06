import { Slate } from 'slates';
import { spec } from './spec';

import {
  createClientTool,
  createProjectTool,
  createServiceTool,
  createTimeEntryTool,
  deleteTimeEntryTool,
  getClientTool,
  getProjectTool,
  getTimeEntryTool,
  listClientsTool,
  listProjectsTool,
  listServicesTool,
  listUsersTool,
  searchTimeEntriesTool,
  updateClientTool,
  updateProjectTool,
  updateServiceTool,
  updateTimeEntryTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listUsersTool,
    listClientsTool,
    getClientTool,
    createClientTool,
    updateClientTool,
    listProjectsTool,
    getProjectTool,
    createProjectTool,
    updateProjectTool,
    listServicesTool,
    createServiceTool,
    updateServiceTool,
    searchTimeEntriesTool,
    getTimeEntryTool,
    createTimeEntryTool,
    updateTimeEntryTool,
    deleteTimeEntryTool
  ],
  triggers: []
});
