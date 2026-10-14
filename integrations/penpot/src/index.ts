import { Slate } from 'slates';
import { spec } from './spec';
import {
  addMediaFromUrlTool,
  exportFileTool,
  getFileSummaryTool,
  getFileTool,
  getFileUrl,
  getPageTool,
  getProfileTool,
  listFileSnapshotsTool,
  listFilesTool,
  listProjectsTool,
  listTeamsTool,
  manageCommentsTool,
  manageFileSnapshotTool,
  manageFileTool,
  manageLibrariesTool,
  managePagesTool,
  manageProjectTool,
  manageTeamTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getProfileTool,
    listTeamsTool,
    manageTeamTool,
    listProjectsTool,
    manageProjectTool,
    listFilesTool,
    listFileSnapshotsTool,
    manageFileTool,
    manageFileSnapshotTool,
    getFileTool,
    getFileSummaryTool,
    getPageTool,
    managePagesTool,
    manageCommentsTool,
    manageLibrariesTool,
    addMediaFromUrlTool,
    exportFileTool,
    getFileUrl
  ],
  triggers: []
});
