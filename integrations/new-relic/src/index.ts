import { Slate } from 'slates';
import { spec } from './spec';
import {
  createChangeTrackingMarker,
  ingestData,
  listAlertIssues,
  manageAlertCondition,
  manageAlertPolicy,
  manageDashboard,
  manageEntityTags,
  manageSyntheticMonitor,
  runNrqlQuery,
  searchEntities
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    runNrqlQuery,
    searchEntities,
    manageAlertPolicy,
    listAlertIssues,
    manageAlertCondition,
    manageDashboard,
    manageSyntheticMonitor,
    createChangeTrackingMarker,
    manageEntityTags,
    ingestData
  ],
  triggers: []
});
