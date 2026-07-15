import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyFileTool,
  createCommentTool,
  createFileTool,
  createSharedDriveTool,
  deleteCommentTool,
  deleteFileTool,
  deleteSharedDriveTool,
  downloadFileTool,
  exportFileTool,
  getAboutTool,
  getFileTool,
  listChangesTool,
  listCommentsTool,
  listPermissionsTool,
  listRevisionsTool,
  listSharedDrivesTool,
  removePermissionTool,
  replyToCommentTool,
  searchFilesTool,
  shareFileTool,
  updateCommentTool,
  updateFileTool,
  updatePermissionTool,
  updateSharedDriveTool,
  uploadFileTool
} from './tools';
import { fileChangesTrigger, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchFilesTool,
    getFileTool,
    createFileTool,
    uploadFileTool,
    downloadFileTool,
    exportFileTool,
    getAboutTool,
    updateFileTool,
    copyFileTool,
    deleteFileTool,
    listPermissionsTool,
    shareFileTool,
    updatePermissionTool,
    removePermissionTool,
    listCommentsTool,
    createCommentTool,
    replyToCommentTool,
    updateCommentTool,
    deleteCommentTool,
    listRevisionsTool,
    listSharedDrivesTool,
    createSharedDriveTool,
    updateSharedDriveTool,
    deleteSharedDriveTool,
    listChangesTool
  ],
  triggers: [inboundWebhook, fileChangesTrigger]
});
