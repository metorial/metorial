import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelBuild,
  getBuildProfile,
  getBuildStatus,
  getConfiguration,
  getWorkflow,
  listBuildProfiles,
  listCommits,
  listConfigurations,
  listDistributionProfiles,
  listOrganizations,
  listSigningIdentities,
  listWorkflows,
  manageDistribution,
  manageEnterpriseStore,
  manageEnvironmentVariables,
  managePublish,
  manageTestingGroups,
  manageWebhooks,
  startBuild
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listBuildProfiles,
    getBuildProfile,
    startBuild,
    getBuildStatus,
    cancelBuild,
    getWorkflow,
    getConfiguration,
    listCommits,
    listWorkflows,
    listConfigurations,
    manageEnvironmentVariables,
    listDistributionProfiles,
    manageDistribution,
    manageTestingGroups,
    listSigningIdentities,
    managePublish,
    manageEnterpriseStore,
    listOrganizations,
    manageWebhooks
  ],
  triggers: []
});
