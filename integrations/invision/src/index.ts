import { Slate } from 'slates';
import { spec } from './spec';
import {
  deprovisionScimUser,
  getDesignTokenStyles,
  getDesignTokens,
  getScimUser,
  listScimUsers,
  provisionScimUser,
  updateScimUser
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getDesignTokens,
    getDesignTokenStyles,
    listScimUsers,
    getScimUser,
    provisionScimUser,
    updateScimUser,
    deprovisionScimUser
  ],
  triggers: [inboundWebhook]
});
