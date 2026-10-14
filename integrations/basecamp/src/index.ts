import { Slate } from 'slates';
import { spec } from './spec';
import {
  createProjectTool,
  getCurrentUserTool,
  getProjectTool,
  listAccountsTool,
  listMessagesTool,
  listPeopleTool,
  listProjectsTool,
  listTodoListsTool,
  listTodosTool,
  manageCommentTool,
  manageMessageTool,
  manageScheduleEntryTool,
  manageTodoListTool,
  manageTodoTool,
  sendCampfireMessageTool,
  updateProjectTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listAccountsTool,
    getCurrentUserTool,
    listProjectsTool,
    getProjectTool,
    createProjectTool,
    updateProjectTool,
    listTodoListsTool,
    manageTodoListTool,
    listTodosTool,
    manageTodoTool,
    listMessagesTool,
    manageMessageTool,
    manageCommentTool,
    sendCampfireMessageTool,
    manageScheduleEntryTool,
    listPeopleTool
  ],
  triggers: []
});
