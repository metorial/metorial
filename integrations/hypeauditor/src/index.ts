import { Slate } from 'slates';
import { spec } from './spec';
import {
  competitorAnalysis,
  discoverInfluencers,
  exportReportPdf,
  getAccountActivity,
  getAccountMedia,
  getBrandMentions,
  getInfluencerReport,
  getMetricsHistory,
  getMyNetwork,
  getReportConnections,
  manageLists,
  searchInfluencers
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    searchInfluencers,
    getInfluencerReport,
    discoverInfluencers,
    getAccountMedia,
    exportReportPdf,
    manageLists,
    competitorAnalysis,
    getBrandMentions,
    getMetricsHistory,
    getMyNetwork,
    getAccountActivity,
    getReportConnections
  ],
  triggers: [inboundWebhook]
});
