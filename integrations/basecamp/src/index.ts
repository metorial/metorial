import { Slate } from 'slates';
import { spec } from './spec';
import {
  createProjectTool,
  getProjectTool,
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
import { projectEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [projectEventsTrigger]
});
