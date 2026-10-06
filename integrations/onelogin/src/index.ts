import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUser,
  deleteUser,
  enrollMfaFactor,
  getApp,
  getEventTypes,
  getGroup,
  getMfaFactors,
  getRole,
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
export let provider = Slate.create({
  spec,
  tools: [
    listUsers.build(),
    getUser.build(),
    getRole.build(),
    getGroup.build(),
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
  triggers: []
});
