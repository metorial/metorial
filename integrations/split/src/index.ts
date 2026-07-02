import { Slate } from 'slates';
import { spec } from './spec';
import {
  createFeatureFlag,
  deleteFeatureFlag,
  getFeatureFlag,
  listEnvironments,
  listFeatureFlags,
  listSegments,
  listTrafficTypes,
  listWorkspaces,
  manageEnvironment,
  manageFlagSet,
  manageGroups,
  manageSegment,
  manageUsers,
  updateFeatureFlag
} from './tools';
import { adminAudit, flagChange, impressions, metricAlert } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listFeatureFlags,
    getFeatureFlag,
    createFeatureFlag,
    updateFeatureFlag,
    deleteFeatureFlag,
    listEnvironments,
    manageEnvironment,
    manageSegment,
    listSegments,
    listWorkspaces,
    manageFlagSet,
    manageUsers,
    manageGroups,
    listTrafficTypes
  ],
  triggers: [flagChange, adminAudit, impressions, metricAlert]
});
