import { Slate } from 'slates';
import { spec } from './spec';
import {
  createFeatureFlag,
  deleteFeatureFlag,
  getFeatureFlag,
  listEnvironments,
  listFeatureFlags,
  listFlagDefinitions,
  listRolloutStatuses,
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
export let provider = Slate.create({
  spec,
  tools: [
    listFeatureFlags,
    listFlagDefinitions,
    listRolloutStatuses,
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
  triggers: []
});
