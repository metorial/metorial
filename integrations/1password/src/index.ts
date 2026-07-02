import { Slate } from 'slates';
import { spec } from './spec';
import {
  createItem,
  deleteItem,
  generatePassword,
  getFileContent,
  getItem,
  getServerHealth,
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
    listItems,
    searchItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    generatePassword,
    getFileContent,
    getServerHealth
  ],
  triggers: [
    inboundWebhook,
    auditEventsTrigger,
    itemUsageEventsTrigger,
    signInAttemptEventsTrigger
  ]
});
