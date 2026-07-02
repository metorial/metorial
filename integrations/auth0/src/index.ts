import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUserTool,
  deleteUserTool,
  getLogsTool,
  getUserTool,
  manageActionsTool,
  manageApplicationsTool,
  manageClientGrantsTool,
  manageConnectionsTool,
  manageOrganizationMembersTool,
  manageOrganizationsTool,
  manageResourceServersTool,
  manageRolesTool,
  manageUserRolesTool,
  searchUsersTool,
  updateUserTool
} from './tools';
import { logEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchUsersTool,
    getUserTool,
    createUserTool,
    updateUserTool,
    deleteUserTool,
    manageUserRolesTool,
    manageRolesTool,
    manageConnectionsTool,
    manageApplicationsTool,
    manageOrganizationsTool,
    manageOrganizationMembersTool,
    getLogsTool,
    manageResourceServersTool,
    manageActionsTool,
    manageClientGrantsTool
  ],
  triggers: [logEventsTrigger]
});
