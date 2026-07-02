import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCommentTool,
  createCycleTool,
  createDocumentTool,
  createIssueTool,
  createLabelTool,
  createProjectTool,
  deleteCommentTool,
  deleteIssueTool,
  getIssueTool,
  getProjectTool,
  getTeamTool,
  getViewerTool,
  listCyclesTool,
  listDocumentsTool,
  listIssuesTool,
  listLabelsTool,
  listProjectsTool,
  listTeamsTool,
  listUsersTool,
  listWorkflowStatesTool,
  searchIssuesTool,
  updateCommentTool,
  updateCycleTool,
  updateDocumentTool,
  updateIssueTool,
  updateLabelTool,
  updateProjectTool
} from './tools';
import {
  commentEventsTrigger,
  cycleEventsTrigger,
  documentEventsTrigger,
  issueEventsTrigger,
  labelEventsTrigger,
  projectEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createIssueTool,
    updateIssueTool,
    getIssueTool,
    listIssuesTool,
    deleteIssueTool,
    searchIssuesTool,
    createProjectTool,
    updateProjectTool,
    listProjectsTool,
    getProjectTool,
    createCommentTool,
    updateCommentTool,
    deleteCommentTool,
    createCycleTool,
    updateCycleTool,
    listCyclesTool,
    listTeamsTool,
    getTeamTool,
    createLabelTool,
    updateLabelTool,
    listLabelsTool,
    createDocumentTool,
    updateDocumentTool,
    listDocumentsTool,
    getViewerTool,
    listUsersTool,
    listWorkflowStatesTool
  ],
  triggers: [
    issueEventsTrigger,
    commentEventsTrigger,
    projectEventsTrigger,
    cycleEventsTrigger,
    documentEventsTrigger,
    labelEventsTrigger
  ]
});
