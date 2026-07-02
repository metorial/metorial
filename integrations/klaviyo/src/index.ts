import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUpdateProfile,
  getEvents,
  getFlows,
  getListSegmentProfiles,
  getMetrics,
  getProfiles,
  getSegments,
  manageCampaigns,
  manageCatalogItems,
  manageCoupons,
  manageLists,
  manageSubscriptions,
  manageTags,
  manageTemplates,
  queryMetricAggregates,
  requestProfileDeletion,
  trackEvent,
  updateFlowStatus
} from './tools';
import { newEvents, newProfiles, webhookEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
    manageCatalogItems,
    manageTemplates,
    manageTags,
    manageCoupons,
    requestProfileDeletion
  ],
  triggers: [webhookEvents, newEvents, newProfiles]
});
