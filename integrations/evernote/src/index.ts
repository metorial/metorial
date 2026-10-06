import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyNoteTool,
  createNotebookTool,
  createNoteTool,
  deleteNoteTool,
  downloadResourceTool,
  getNoteContentTool,
  getNoteTool,
  listNotebooksTool,
  listSavedSearchesTool,
  listTagsTool,
  manageTagTool,
  searchNotesTool,
  updateNotebookTool,
  updateNoteTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listNotebooksTool,
    createNotebookTool,
    updateNotebookTool,
    createNoteTool,
    getNoteTool,
    getNoteContentTool,
    downloadResourceTool,
    updateNoteTool,
    deleteNoteTool,
    searchNotesTool,
    listTagsTool,
    listSavedSearchesTool,
    manageTagTool,
    copyNoteTool
  ],
  triggers: []
});
