import { Slate } from 'slates';
import { spec } from './spec';
import {
  createChangeTrackingMarker,
  ingestData,
  manageAlertCondition,
  manageDashboard,
  manageEntityTags,
  manageSyntheticMonitor,
  runNrqlQuery,
  searchEntities
} from './tools';
import { alertIssues, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    runNrqlQuery,
    searchEntities,
    manageAlertCondition,
    manageDashboard,
    manageSyntheticMonitor,
    createChangeTrackingMarker,
    manageEntityTags,
    ingestData
  ],
  triggers: [inboundWebhook, alertIssues]
});
