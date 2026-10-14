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
  getKeywordPosts,
  getMetricsHistory,
  getMyNetwork,
  getReportConnections,
  getTaxonomy,
  manageLists,
  searchInfluencers
} from './tools';

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
    getReportConnections,
    getTaxonomy,
    getKeywordPosts
  ],
  triggers: []
});
