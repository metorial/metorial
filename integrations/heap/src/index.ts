import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteUser,
  identifyUser,
  manageAccountProperties,
  manageUserProperties,
  trackEvent
} from './tools';
import { segmentSync } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [trackEvent, manageUserProperties, manageAccountProperties, identifyUser, deleteUser],
  triggers: [segmentSync]
});
