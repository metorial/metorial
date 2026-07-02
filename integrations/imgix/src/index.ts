import { Slate } from 'slates';
import { spec } from './spec';
import {
  buildRenderUrl,
  createSource,
  generateSignedUrl,
  getAsset,
  getReports,
  getSource,
  listAssets,
  listSources,
  purgeCache,
  refreshAsset,
  updateAsset,
  updateSource
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listSources,
    getSource,
    createSource,
    updateSource,
    listAssets,
    getAsset,
    updateAsset,
    refreshAsset,
    purgeCache,
    getReports,
    generateSignedUrl,
    buildRenderUrl
  ],
  triggers: [inboundWebhook]
});
