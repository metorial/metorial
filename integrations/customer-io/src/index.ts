import { Slate } from 'slates';
import { spec } from './spec';
import {
  deletePerson,
  getBroadcast,
  getCampaign,
  getMessage,
  getPerson,
  getSegmentMembership,
  getTransactionalMessage,
  listBroadcasts,
  listCampaigns,
  listCollections,
  listMessages,
  listSegments,
  listTransactionalMessages,
  manageCollection,
  manageDevice,
  manageExport,
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
    listBroadcasts,
    getBroadcast,
    triggerBroadcast,
    listTransactionalMessages,
    getTransactionalMessage,
    sendTransactionalMessage,
    listMessages,
    getMessage,
    manageExport,
    manageCollection,
    listCollections
  ],
  triggers: [messageEvent, subscriptionEvent]
});
