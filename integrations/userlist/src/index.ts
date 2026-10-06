import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrUpdateCompany,
  createOrUpdateUser,
  deleteCompany,
  deleteUser,
  manageRelationship,
  sendMessage,
  trackEvent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createOrUpdateUser,
    deleteUser,
    createOrUpdateCompany,
    deleteCompany,
    manageRelationship,
    trackEvent,
    sendMessage
  ],
  triggers: []
});
