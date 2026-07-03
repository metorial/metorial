import { Slate } from 'slates';
import { spec } from './spec';
import {
  findJobsWithScmUrl,
  getBuild,
  getBuildChangesets,
  getBuildLog,
  getBuildScm,
  getFlakyFailures,
  getJob,
  getJobScm,
  getQueueItem,
  getReplayScripts,
  getStatus,
  getTestResults,
  listJobs,
  rebuildBuild,
  replayBuild,
  searchBuildLog,
  triggerBuild,
  updateBuild,
  whoAmI
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getJob,
    listJobs,
    triggerBuild,
    getQueueItem,
    getBuild,
    updateBuild,
    getBuildLog,
    searchBuildLog,
    rebuildBuild,
    getReplayScripts,
    replayBuild,
    getTestResults,
    getFlakyFailures,
    getJobScm,
    getBuildScm,
    getBuildChangesets,
    findJobsWithScmUrl,
    whoAmI,
    getStatus
  ],
  triggers: []
});
