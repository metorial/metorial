import { Slate } from 'slates';
import { spec } from './spec';
import {
  getChannelStatus,
  getMessageHistory,
  getPresence,
  getPresenceHistory,
  getStatistics,
  manageApps,
  manageKeys,
  manageNamespaces,
  manageQueues,
  manageRules,
  publishMessage,
  requestToken,
  revokeTokens
} from './tools';
import { channelEvents } from './triggers';

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
    manageNamespaces
  ],
  triggers: [channelEvents]
});
