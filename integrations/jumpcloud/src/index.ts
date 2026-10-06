import { Slate } from 'slates';
import { spec } from './spec';
import {
  getResource,
  getSystem,
  getUser,
  listApplications,
  listCommandResults,
  listGroups,
  listOrganizations,
  listSystems,
  listUsers,
  manageAssociations,
  manageCommand,
  manageGroupMembership,
  manageSystem,
  manageSystemGroup,
  manageUser,
  manageUserGroup,
  queryEvents,
  runCommand,
  userActions
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listOrganizations,
    getResource,
    listUsers,
    getUser,
    manageUser,
    userActions,
    listSystems,
    getSystem,
    manageSystem,
    listGroups,
    manageUserGroup,
    manageSystemGroup,
    manageGroupMembership,
    manageAssociations,
    manageCommand,
    runCommand,
    listCommandResults,
    listApplications,
    queryEvents
  ],
  triggers: []
});
