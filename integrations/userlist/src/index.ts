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
import {
  companyEvents,
  formEvents,
  messageEvents,
  relationshipEvents,
  userEvents
} from './triggers';

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
  triggers: [userEvents, companyEvents, relationshipEvents, messageEvents, formEvents]
});
