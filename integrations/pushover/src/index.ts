import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelEmergency,
  checkAppLimits,
  checkReceipt,
  listSounds,
  manageGroup,
  manageGroupMembers,
  migrateSubscription,
  pushGlance,
  sendNotification,
  validateUser
} from './tools';
import { emergencyAcknowledged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendNotification,
    checkReceipt,
    cancelEmergency,
    manageGroup,
    manageGroupMembers,
    validateUser,
    pushGlance,
    checkAppLimits,
    listSounds,
    migrateSubscription
  ],
  triggers: [emergencyAcknowledged]
});
