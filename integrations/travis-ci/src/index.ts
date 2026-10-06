import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBuild,
  getBuildRequest,
  getCurrentUser,
  getJobLog,
  getRepository,
  lintTravisYml,
  listBranches,
  listBuildRequests,
  listBuilds,
  listRepositories,
  manageBuild,
  manageCaches,
  manageCrons,
  manageEnvVars,
  manageJob,
  manageJobLog,
  manageRepositorySettings,
  triggerBuild
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listRepositories,
    getRepository,
    listBuilds,
    getBuild,
    triggerBuild,
    manageBuild,
    manageJob,
    getJobLog,
    manageEnvVars,
    manageCrons,
    manageCaches,
    listBranches,
    lintTravisYml,
    listBuildRequests,
    getCurrentUser,
    getBuildRequest,
    manageRepositorySettings,
    manageJobLog
  ],
  triggers: []
});
