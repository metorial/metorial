import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountInfo,
  getCarbonOffset,
  getCreditBalance,
  getForestInfo,
  listProjects,
  plantTrees
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getAccountInfo,
    getForestInfo,
    listProjects,
    plantTrees,
    getCreditBalance,
    getCarbonOffset
  ],
  triggers: [inboundWebhook]
});
