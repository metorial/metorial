import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteUser,
  identifyUser,
  manageAccountProperties,
  manageUserProperties,
  trackEvent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [trackEvent, manageUserProperties, manageAccountProperties, identifyUser, deleteUser],
  triggers: []
});
