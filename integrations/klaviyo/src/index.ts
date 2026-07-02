import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUpdateProfile,
  getAccount,
  getEvents,
  getFlows,
  getForms,
  getListSegmentProfiles,
  getMetrics,
  getProfiles,
  getSegments,
  manageCampaigns,
  manageCatalogItems,
  manageCoupons,
  manageImages,
  manageLists,
  manageSubscriptions,
  manageTags,
  manageTemplates,
  queryMetricAggregates,
  queryReports,
  requestProfileDeletion,
  trackEvent,
  updateFlowStatus
} from './tools';
import { newEvents, newProfiles, webhookEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAccount,
    getProfiles,
    createUpdateProfile,
    manageSubscriptions,
    manageLists,
    getListSegmentProfiles,
    getSegments,
    manageCampaigns,
    getFlows,
    updateFlowStatus,
    trackEvent,
    getEvents,
    getMetrics,
    queryMetricAggregates,
    queryReports,
    manageCatalogItems,
    getForms,
    manageImages,
    manageTemplates,
    manageTags,
    manageCoupons,
    requestProfileDeletion
  ],
  triggers: [webhookEvents, newEvents, newProfiles]
});
