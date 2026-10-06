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
  triggers: []
});
