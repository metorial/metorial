import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrUpdateGroup,
  createOrUpdateUser,
  deleteGroup,
  deleteUser,
  getContent,
  getGroup,
  getUser,
  listContent,
  listEventDefinitions,
  listGroups,
  listUsers,
  manageWebhookSubscription,
  removeGroupMembership,
  trackEvent
} from './tools';
import { eventTracked, groupEvents, userEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createOrUpdateUser,
    getUser,
    listUsers,
    deleteUser,
    createOrUpdateGroup,
    getGroup,
    listGroups,
    deleteGroup,
    removeGroupMembership,
    trackEvent,
    listEventDefinitions,
    listContent,
    getContent,
    manageWebhookSubscription
  ],
  triggers: [userEvents, groupEvents, eventTracked]
});
