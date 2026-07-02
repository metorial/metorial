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
  manageLogStreamsTool,
  manageOrganizationMemberRolesTool,
  manageOrganizationMembersTool,
  manageOrganizationsTool,
  manageResourceServersTool,
  manageRolePermissionsTool,
  manageRolesTool,
  manageUserPermissionsTool,
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
    manageRolePermissionsTool,
    manageConnectionsTool,
    manageApplicationsTool,
    manageOrganizationsTool,
    manageOrganizationMembersTool,
    manageOrganizationMemberRolesTool,
    getLogsTool,
    manageLogStreamsTool,
    manageResourceServersTool,
    manageUserPermissionsTool,
    manageActionsTool,
    manageClientGrantsTool
  ],
  triggers: [logEventsTrigger]
});
