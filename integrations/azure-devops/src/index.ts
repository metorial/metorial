import { Slate } from 'slates';
import { spec } from './spec';
import {
  createWorkItemTool,
  deleteWorkItemTool,
  getPipelineRunTool,
  getWorkItemTool,
  listBuildsTool,
  listPipelinesTool,
  listProjectsTool,
  managePullRequestTool,
  manageRepositoryTool,
  manageWikiTool,
  queryWorkItemsTool,
  runPipelineTool,
  updateWorkItemTool
} from './tools';
import {
  buildCompleteEventsTrigger,
  codeEventsTrigger,
  pullRequestEventsTrigger,
  workItemEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjectsTool,
    getWorkItemTool,
    createWorkItemTool,
    updateWorkItemTool,
    deleteWorkItemTool,
    queryWorkItemsTool,
    manageRepositoryTool,
    managePullRequestTool,
    listPipelinesTool,
    runPipelineTool,
    getPipelineRunTool,
    listBuildsTool,
    manageWikiTool
  ],
  triggers: [
    workItemEventsTrigger,
    codeEventsTrigger,
    pullRequestEventsTrigger,
    buildCompleteEventsTrigger
  ]
});
