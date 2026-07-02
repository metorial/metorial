import { Slate } from 'slates';
import { spec } from './spec';
import {
  addMediaFromUrlTool,
  exportFileTool,
  getFileSummaryTool,
  getFileTool,
  getPageTool,
  getProfileTool,
  listFilesTool,
  listProjectsTool,
  listTeamsTool,
  manageCommentsTool,
  manageFileTool,
  manageLibrariesTool,
  managePagesTool,
  manageProjectTool,
  manageTeamTool
} from './tools';
import { teamEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getProfileTool,
    listTeamsTool,
    manageTeamTool,
    listProjectsTool,
    manageProjectTool,
    listFilesTool,
    manageFileTool,
    getFileTool,
    getFileSummaryTool,
    getPageTool,
    managePagesTool,
    manageCommentsTool,
    manageLibrariesTool,
    addMediaFromUrlTool,
    exportFileTool
  ],
  triggers: [teamEventsTrigger]
});
