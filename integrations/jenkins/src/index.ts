import { Slate } from 'slates';
import { spec } from './spec';
import {
  executeScript,
  getBuild,
  getJob,
  getJobConfig,
  getSystemInfo,
  listBuilds,
  listJobs,
  manageCredentials,
  manageFolder,
  manageJob,
  manageNode,
  managePlugins,
  manageQueue,
  manageView,
  stopBuild,
  triggerBuild
} from './tools';
import { buildEvent, inboundWebhook, jobStatusChange } from './triggers';

export let jenkins = Slate.create({
  spec,
  tools: [
    listJobs,
    getJob,
    getJobConfig,
    manageJob,
    triggerBuild,
    getBuild,
    listBuilds,
    stopBuild,
    manageQueue,
    manageView,
    manageNode,
    managePlugins,
    manageCredentials,
    manageFolder,
    executeScript,
    getSystemInfo
  ],
  triggers: [inboundWebhook, buildEvent, jobStatusChange]
});
