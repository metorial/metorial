import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyNoteTool,
  createNotebookTool,
  createNoteTool,
  deleteNoteTool,
  getNoteContentTool,
  getNoteTool,
  listNotebooksTool,
  listTagsTool,
  manageTagTool,
  searchNotesTool,
  updateNotebookTool,
  updateNoteTool
} from './tools';
import { noteChangesTrigger, noteUpdatesPollTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listNotebooksTool,
    createNotebookTool,
    updateNotebookTool,
    createNoteTool,
    getNoteTool,
    getNoteContentTool,
    updateNoteTool,
    deleteNoteTool,
    searchNotesTool,
    listTagsTool,
    manageTagTool,
    copyNoteTool
  ],
  triggers: [noteChangesTrigger, noteUpdatesPollTrigger]
});
