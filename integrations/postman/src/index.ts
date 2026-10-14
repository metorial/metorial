import { Slate } from 'slates';
import { spec } from './spec';
import {
  createWebhookTool,
  forkCollectionTool,
  getCollectionTool,
  getEnvironmentTool,
  getUserTool,
  getWorkspaceTool,
  importOpenApiTool,
  listCollectionsTool,
  listEnvironmentsTool,
  listWorkspacesTool,
  manageApiTool,
  manageCollectionTool,
  manageCommentTool,
  manageEnvironmentTool,
  manageMockServerTool,
  manageMonitorTool,
  managePullRequestTool,
  manageTagsTool,
  manageWorkspaceTool,
  runMonitorTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listWorkspacesTool,
    getWorkspaceTool,
    manageWorkspaceTool,
    listCollectionsTool,
    getCollectionTool,
    manageCollectionTool,
    importOpenApiTool,
    forkCollectionTool,
    managePullRequestTool,
    listEnvironmentsTool,
    getEnvironmentTool,
    manageEnvironmentTool,
    manageMockServerTool,
    manageMonitorTool,
    runMonitorTool,
    manageApiTool,
    manageCommentTool,
    getUserTool,
    manageTagsTool,
    createWebhookTool
  ],
  triggers: []
});
