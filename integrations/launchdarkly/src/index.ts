import { Slate } from 'slates';
import { spec } from './spec';
import {
  createFeatureFlag,
  deleteFeatureFlag,
  getCurrentIdentity,
  getFeatureFlag,
  getSegment,
  inviteMembers,
  listEnvironments,
  listExperiments,
  listFeatureFlags,
  listMembers,
  listMetrics,
  listProjects,
  listSegments,
  manageEnvironment,
  manageProject,
  manageSegment,
  queryAuditLog,
  searchContexts,
  toggleFeatureFlag,
  updateFeatureFlag
} from './tools';
import { flagChangeTrigger, resourceChangeTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getCurrentIdentity,
    listFeatureFlags,
    getFeatureFlag,
    createFeatureFlag,
    updateFeatureFlag,
    toggleFeatureFlag,
    deleteFeatureFlag,
    listProjects,
    manageProject,
    listEnvironments,
    manageEnvironment,
    listSegments,
    getSegment,
    manageSegment,
    queryAuditLog,
    listMembers,
    inviteMembers,
    searchContexts,
    listMetrics,
    listExperiments
  ],
  triggers: [resourceChangeTrigger, flagChangeTrigger]
});
