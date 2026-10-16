import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelEmergency,
  checkAppLimits,
  checkReceipt,
  getGroup,
  listGroups,
  listSounds,
  manageGroup,
  manageGroupMembers,
  migrateSubscription,
  pushGlance,
  sendNotification,
  validateUser
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendNotification,
    checkReceipt,
    getGroup,
    listGroups,
    cancelEmergency,
    manageGroup,
    manageGroupMembers,
    validateUser,
    pushGlance,
    checkAppLimits,
    listSounds,
    migrateSubscription
  ],
  triggers: []
});
