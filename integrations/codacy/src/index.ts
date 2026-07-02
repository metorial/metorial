import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRepository,
  configureAnalysisTool,
  getCommitAnalysis,
  getPullRequestAnalysis,
  getRepositoryAnalysis,
  listCodingStandards,
  listFiles,
  listOrganizations,
  listPeople,
  listPullRequests,
  listRepositories,
  listRepositoryTools,
  manageDastTarget,
  manageRepositoryToken,
  searchIssues,
  searchSbomDependencies,
  searchSecurityItems
} from './tools';
import { inboundWebhook, newPullRequests, newSecurityItems } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listOrganizations,
    listRepositories,
    getRepositoryAnalysis,
    searchIssues,
    listPullRequests,
    getPullRequestAnalysis,
    addRepository,
    listFiles,
    searchSecurityItems,
    searchSbomDependencies,
    listRepositoryTools,
    configureAnalysisTool,
    manageDastTarget,
    listCodingStandards,
    listPeople,
    getCommitAnalysis,
    manageRepositoryToken
  ],
  triggers: [inboundWebhook, newPullRequests, newSecurityItems]
});
