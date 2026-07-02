import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConnectSession,
  getRecords,
  listConnections,
  listIntegrations,
  manageConnection,
  manageConnectionMetadata,
  manageIntegration,
  manageSync,
  proxyRequest,
  triggerAction
} from './tools';
import { connectionEvents, inboundWebhook, syncEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listIntegrations,
    manageIntegration,
    listConnections,
    manageConnection,
    proxyRequest,
    manageSync,
    getRecords,
    triggerAction,
    createConnectSession,
    manageConnectionMetadata
  ],
  triggers: [inboundWebhook, connectionEvents, syncEvents]
});
