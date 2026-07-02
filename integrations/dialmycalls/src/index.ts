import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelTextBroadcast,
  cancelVoiceBroadcast,
  createTextBroadcast,
  createVoiceBroadcast,
  getAccount,
  listAccessAccounts,
  listCallerIds,
  listContacts,
  listDoNotContacts,
  listGroups,
  listIncomingTexts,
  listKeywords,
  listRecordings,
  listTextBroadcasts,
  listVanityNumbers,
  listVoiceBroadcasts,
  manageAccessAccount,
  manageCallerId,
  manageContact,
  manageGroup,
  manageRecording
} from './tools';
import { inboundWebhook, newContact, newIncomingText } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    manageContact,
    listGroups,
    manageGroup,
    createVoiceBroadcast,
    listVoiceBroadcasts,
    cancelVoiceBroadcast,
    createTextBroadcast,
    listTextBroadcasts,
    cancelTextBroadcast,
    manageRecording,
    listRecordings,
    manageCallerId,
    listCallerIds,
    listIncomingTexts,
    listKeywords,
    listVanityNumbers,
    listDoNotContacts,
    manageAccessAccount,
    listAccessAccounts,
    getAccount
  ],
  triggers: [inboundWebhook, newIncomingText, newContact]
});
