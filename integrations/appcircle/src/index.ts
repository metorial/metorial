import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelBuild,
  getBuildProfile,
  getBuildStatus,
  listBuildProfiles,
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
import {
  buildEvents,
  distributionEvents,
  enterpriseStoreEvents,
  publishEvents,
  signingIdentityEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listBuildProfiles,
    getBuildProfile,
    startBuild,
    getBuildStatus,
    cancelBuild,
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
  triggers: [
    buildEvents,
    distributionEvents,
    signingIdentityEvents,
    publishEvents,
    enterpriseStoreEvents
  ]
});
