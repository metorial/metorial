import { Slate } from 'slates';
import { spec } from './spec';
import {
  countTokens,
  getOrganization,
  getUsageReport,
  listModels,
  manageApiKeys,
  manageFiles,
  manageMessageBatch,
  manageOrganizationMembers,
  manageWorkspaces,
  sendMessage
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    countTokens,
    listModels,
    manageMessageBatch,
    manageOrganizationMembers,
    manageWorkspaces,
    manageApiKeys,
    getOrganization,
    manageFiles,
    getUsageReport
  ],
  triggers: [inboundWebhook]
});
