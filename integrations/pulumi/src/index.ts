import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelDeployment,
  createStack,
  deleteStack,
  getCurrentUser,
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
export let provider = Slate.create({
  spec,
  tools: [
    listStacks,
    getCurrentUser,
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
  triggers: []
});
