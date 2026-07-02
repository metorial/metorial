import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUserTool,
  getUserTool,
  listApplicationsTool,
  listGroupsTool,
  listPoliciesTool,
  listUsersTool,
  manageAppAssignmentTool,
  manageGroupMembershipTool,
  manageGroupTool,
  manageUserFactorsTool,
  querySystemLogTool,
  updateUserTool,
  userLifecycleTool
} from './tools';
import { eventHookTrigger, systemLogPollTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listUsersTool,
    getUserTool,
    createUserTool,
    updateUserTool,
    userLifecycleTool,
    listGroupsTool,
    manageGroupTool,
    manageGroupMembershipTool,
    listApplicationsTool,
    manageAppAssignmentTool,
    querySystemLogTool,
    listPoliciesTool,
    manageUserFactorsTool
  ],
  triggers: [eventHookTrigger, systemLogPollTrigger]
});
