import { Slate } from 'slates';
import { spec } from './spec';
import {
  deletePerson,
  getCampaign,
  getPerson,
  getSegmentMembership,
  listCampaigns,
  listCollections,
  listSegments,
  manageCollection,
  manageDevice,
  manageManualSegment,
  mergePeople,
  searchPeople,
  sendTransactionalMessage,
  suppressPerson,
  trackEvent,
  triggerBroadcast,
  upsertPerson
} from './tools';
import { messageEvent, subscriptionEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    upsertPerson,
    deletePerson,
    suppressPerson,
    getPerson,
    searchPeople,
    mergePeople,
    trackEvent,
    manageDevice,
    listSegments,
    getSegmentMembership,
    manageManualSegment,
    listCampaigns,
    getCampaign,
    triggerBroadcast,
    sendTransactionalMessage,
    manageCollection,
    listCollections
  ],
  triggers: [messageEvent, subscriptionEvent]
});
