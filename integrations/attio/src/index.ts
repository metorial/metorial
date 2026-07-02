import { Slate } from 'slates';
import { spec } from './spec';
import {
  addListEntryTool,
  createCommentTool,
  createNoteTool,
  createRecordTool,
  createTaskTool,
  deleteCommentTool,
  deleteListEntryTool,
  deleteNoteTool,
  deleteRecordTool,
  deleteTaskTool,
  getListsTool,
  getRecordTool,
  getThreadTool,
  listAttributesTool,
  listNotesTool,
  listObjectsTool,
  listTasksTool,
  listWorkspaceMembersTool,
  queryListEntriesTool,
  queryRecordsTool,
  searchRecordsTool,
  updateListEntryTool,
  updateRecordTool,
  updateTaskTool
} from './tools';
import {
  commentEventsTrigger,
  listEntryEventsTrigger,
  noteEventsTrigger,
  recordEventsTrigger,
  taskEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getRecordTool,
    createRecordTool,
    updateRecordTool,
    deleteRecordTool,
    queryRecordsTool,
    searchRecordsTool,
    listObjectsTool,
    listAttributesTool,
    getListsTool,
    addListEntryTool,
    updateListEntryTool,
    deleteListEntryTool,
    queryListEntriesTool,
    listNotesTool,
    createNoteTool,
    deleteNoteTool,
    listTasksTool,
    createTaskTool,
    updateTaskTool,
    deleteTaskTool,
    createCommentTool,
    getThreadTool,
    deleteCommentTool,
    listWorkspaceMembersTool
  ],
  triggers: [
    recordEventsTrigger,
    listEntryEventsTrigger,
    noteEventsTrigger,
    taskEventsTrigger,
    commentEventsTrigger
  ]
});
