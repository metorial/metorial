import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkContactAction,
  getWorkspace,
  listCampaigns,
  listChannels,
  listContacts,
  listFlows,
  listGroups,
  listMessages,
  listRuns,
  listTickets,
  manageCampaignEvents,
  manageCampaigns,
  manageContacts,
  manageFields,
  manageGlobals,
  manageGroups,
  manageLabels,
  manageTickets,
  sendBroadcast,
  sendMessage,
  startFlow
} from './tools';
import { newFlowRun, newMessage, resthookEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageContacts,
    listContacts,
    bulkContactAction,
    sendMessage,
    sendBroadcast,
    listMessages,
    listFlows,
    startFlow,
    listRuns,
    manageCampaigns,
    listCampaigns,
    manageCampaignEvents,
    manageGroups,
    listGroups,
    manageLabels,
    manageFields,
    listTickets,
    manageTickets,
    manageGlobals,
    getWorkspace,
    listChannels
  ],
  triggers: [resthookEvent, newMessage, newFlowRun]
});
