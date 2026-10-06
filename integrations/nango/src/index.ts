import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConnectSession,
  getRecords,
  listConnections,
  listFunctions,
  listIntegrations,
  listProviders,
  manageConnection,
  manageConnectionMetadata,
  manageIntegration,
  manageSync,
  proxyRequest,
  triggerAction
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listIntegrations,
    listFunctions,
    listProviders,
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
  triggers: []
});
