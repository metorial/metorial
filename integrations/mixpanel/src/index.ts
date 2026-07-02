import { Slate } from 'slates';
import { spec } from './spec';
import {
  exportEvents,
  getActivityFeed,
  getTopEvents,
  importEvents,
  listCohorts,
  listFunnels,
  manageAnnotations,
  manageGroupProfile,
  manageIdentities,
  manageUserProfile,
  queryFunnel,
  queryInsights,
  queryProfiles,
  queryRetention,
  querySegmentation,
  trackEvents
} from './tools';
import { cohortSync } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    importEvents,
    trackEvents,
    manageUserProfile,
    manageGroupProfile,
    querySegmentation,
    queryFunnel,
    listFunnels,
    queryRetention,
    queryProfiles,
    exportEvents,
    manageAnnotations,
    manageIdentities,
    getActivityFeed,
    getTopEvents,
    listCohorts,
    queryInsights
  ],
  triggers: [cohortSync]
});
