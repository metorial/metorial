import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  getChannelStatus,
  getControlStatistics,
  getMessageHistory,
  getPresence,
  getPresenceHistory,
  getServiceTime,
  getStatistics,
  manageApps,
  manageKeys,
  manageNamespaces,
  manageQueues,
  manageRules,
  publishMessage,
  requestToken,
  revokeTokens,
  whoAmI
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    publishMessage,
    getMessageHistory,
    getPresence,
    getPresenceHistory,
    getChannelStatus,
    getStatistics,
    requestToken,
    revokeTokens,
    manageApps,
    manageKeys,
    manageRules,
    manageQueues,
    manageNamespaces,
    whoAmI,
    getServiceTime,
    getControlStatistics
  ],
  toolCategories: [
    toolCategory({
      key: 'pubsub',
      name: 'Pub/Sub REST API',
      description:
        'Messaging, presence, channel metadata, application usage, and client token operations using an API key.',
      tools: [
        publishMessage,
        getMessageHistory,
        getPresence,
        getPresenceHistory,
        getChannelStatus,
        getStatistics,
        requestToken,
        revokeTokens,
        getServiceTime
      ]
    }),
    toolCategory({
      key: 'control',
      name: 'Control API',
      description:
        'Manage apps, API keys, integration rules, queues, namespaces, and usage with a Control API token.',
      tools: [
        manageApps,
        manageKeys,
        manageRules,
        manageQueues,
        manageNamespaces,
        getControlStatistics
      ]
    })
  ],
  triggers: []
});
