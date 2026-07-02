import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelDeployment,
  createStack,
  deleteStack,
  getDeployment,
  getStack,
  listAuditLogs,
  listDeployments,
  listEnvironments,
  listOrgMembers,
  listPolicyPacks,
  listStacks,
  listStackUpdates,
  manageAccessTokens,
  manageEnvironment,
  manageStackTags,
  manageWebhooks,
  openEnvironment,
  searchResources,
  triggerDeployment
} from './tools';
import { deploymentEvents, driftEvents, policyViolationEvents, stackEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listStacks,
    getStack,
    createStack,
    deleteStack,
    triggerDeployment,
    getDeployment,
    listDeployments,
    cancelDeployment,
    listStackUpdates,
    manageStackTags,
    manageEnvironment,
    listEnvironments,
    openEnvironment,
    searchResources,
    listAuditLogs,
    listOrgMembers,
    manageAccessTokens,
    listPolicyPacks,
    manageWebhooks
  ],
  triggers: [stackEvents, deploymentEvents, driftEvents, policyViolationEvents]
});
