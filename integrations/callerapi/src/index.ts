import { Slate } from 'slates';
import { spec } from './spec';
import {
  assessPortFraudRisk,
  checkOnlinePresence,
  checkPortedStatus,
  getAccountInfo,
  getCallerId,
  getCallerPicture,
  getPortingHistory,
  lookupPhoneNumber
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    lookupPhoneNumber,
    getCallerId,
    getCallerPicture,
    checkPortedStatus,
    getPortingHistory,
    assessPortFraudRisk,
    checkOnlinePresence,
    getAccountInfo
  ],
  triggers: []
});
