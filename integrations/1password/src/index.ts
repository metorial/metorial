import { Slate } from 'slates';
import { spec } from './spec';
import {
  createItem,
  deleteItem,
  generatePassword,
  getFileContent,
  getFileMetadata,
  getItem,
  getPrometheusMetrics,
  getServerHealth,
  getServerHeartbeat,
  getVault,
  listApiActivity,
  listFiles,
  listItems,
  listVaults,
  searchItems,
  updateItem
} from './tools';
import {
  auditEventsTrigger,
  inboundWebhook,
  itemUsageEventsTrigger,
  signInAttemptEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listVaults,
    getVault,
    listItems,
    searchItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    generatePassword,
    listFiles,
    getFileMetadata,
    getFileContent,
    listApiActivity,
    getServerHeartbeat,
    getServerHealth,
    getPrometheusMetrics
  ],
  triggers: [
    inboundWebhook,
    auditEventsTrigger,
    itemUsageEventsTrigger,
    signInAttemptEventsTrigger
  ]
});
