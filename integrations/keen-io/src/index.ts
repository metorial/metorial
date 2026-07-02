import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteEvents,
  extractEvents,
  funnelAnalysis,
  getProjectInfo,
  inspectSchema,
  manageAccessKeys,
  manageCachedDatasets,
  manageSavedQueries,
  recordEvents,
  runQuery
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    recordEvents,
    runQuery,
    funnelAnalysis,
    extractEvents,
    manageSavedQueries,
    manageAccessKeys,
    manageCachedDatasets,
    inspectSchema,
    deleteEvents,
    getProjectInfo
  ] as any,
  triggers: [inboundWebhook]
});
