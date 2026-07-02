import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCustomProperty,
  createGoal,
  createSharedLink,
  createSite,
  deleteCustomProperty,
  deleteGoal,
  deleteSite,
  getRealtimeVisitors,
  getSite,
  inviteGuest,
  listCustomProperties,
  listGoals,
  listGuests,
  listSites,
  listTeams,
  queryAnalytics,
  removeGuest,
  sendEvent,
  updateSite
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    queryAnalytics,
    getRealtimeVisitors,
    sendEvent,
    createSite,
    updateSite,
    deleteSite,
    getSite,
    listSites,
    createGoal,
    listGoals,
    deleteGoal,
    listCustomProperties,
    createCustomProperty,
    deleteCustomProperty,
    createSharedLink,
    listGuests,
    inviteGuest,
    removeGuest,
    listTeams
  ],
  triggers: [inboundWebhook]
});
