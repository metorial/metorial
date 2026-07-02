import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBoardTool,
  createColumnTool,
  createGroupTool,
  createItemTool,
  createSubitemTool,
  createUpdateTool,
  createWorkspaceTool,
  deleteUpdateTool,
  getActivityLogsTool,
  listBoardsTool,
  listColumnsTool,
  listGroupsTool,
  listItemsTool,
  listTagsTool,
  listTeamsTool,
  listUpdatesTool,
  listUsersTool,
  listWorkspacesTool,
  sendNotificationTool,
  updateBoardTool,
  updateGroupTool,
  updateItemTool,
  updateWorkspaceTool
} from './tools';
import { columnValueChangesTrigger, itemEventsTrigger, updateEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listBoardsTool,
    createBoardTool,
    updateBoardTool,
    listItemsTool,
    createItemTool,
    updateItemTool,
    createSubitemTool,
    listGroupsTool,
    createGroupTool,
    updateGroupTool,
    listColumnsTool,
    createColumnTool,
    listUpdatesTool,
    createUpdateTool,
    deleteUpdateTool,
    listUsersTool,
    listTeamsTool,
    listWorkspacesTool,
    createWorkspaceTool,
    updateWorkspaceTool,
    sendNotificationTool,
    listTagsTool,
    getActivityLogsTool
  ],
  triggers: [itemEventsTrigger, columnValueChangesTrigger, updateEventsTrigger]
});
