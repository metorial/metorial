import { Slate } from 'slates';
import { spec } from './spec';
import {
  getSystem,
  getUser,
  listApplications,
  listCommandResults,
  listGroups,
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
import {
  authenticationEvents,
  directoryEvents,
  inboundWebhook,
  systemEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, directoryEvents, authenticationEvents, systemEvents]
});
