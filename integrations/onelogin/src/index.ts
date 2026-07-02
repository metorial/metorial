import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUser,
  deleteUser,
  enrollMfaFactor,
  getApp,
  getEventTypes,
  getMfaFactors,
  getUser,
  listApps,
  listEvents,
  listGroups,
  listRoles,
  listUsers,
  manageApp,
  manageRole,
  manageUserRoles,
  updateUser,
  verifyMfaFactor
} from './tools';
import { accountEvents, eventWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listUsers.build(),
    getUser.build(),
    createUser.build(),
    updateUser.build(),
    deleteUser.build(),
    listRoles.build(),
    manageRole.build(),
    listApps.build(),
    getApp.build(),
    manageApp.build(),
    listGroups.build(),
    listEvents.build(),
    getEventTypes.build(),
    manageUserRoles.build(),
    getMfaFactors.build(),
    enrollMfaFactor.build(),
    verifyMfaFactor.build()
  ],
  triggers: [accountEvents.build(), eventWebhook.build()]
});
