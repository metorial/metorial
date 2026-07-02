import { Slate } from 'slates';
import { spec } from './spec';

import {
  addCommentTool,
  createChannelTool,
  createFolderTool,
  createShowcaseTool,
  deleteChannelTool,
  deleteFolderTool,
  deleteShowcaseTool,
  deleteVideoTool,
  editShowcaseTool,
  editVideoTool,
  getChannelTool,
  getShowcaseVideosTool,
  getUserTool,
  getVideoTool,
  likeVideoTool,
  listCategoriesTool,
  listCategoryVideosTool,
  listChannelsTool,
  listChannelVideosTool,
  listCommentsTool,
  listFoldersTool,
  listFolderVideosTool,
  listLikedVideosTool,
  listShowcasesTool,
  listVideosTool,
  manageChannelVideoTool,
  manageFolderVideoTool,
  manageShowcaseVideoTool,
  searchVideosTool
} from './tools';

import { newVideoTrigger, videoEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getVideoTool,
    listVideosTool,
    searchVideosTool,
    editVideoTool,
    deleteVideoTool,
    listCommentsTool,
    addCommentTool,
    getUserTool,
    listLikedVideosTool,
    likeVideoTool,
    listShowcasesTool,
    createShowcaseTool,
    editShowcaseTool,
    deleteShowcaseTool,
    getShowcaseVideosTool,
    manageShowcaseVideoTool,
    listFoldersTool,
    createFolderTool,
    deleteFolderTool,
    listFolderVideosTool,
    manageFolderVideoTool,
    listChannelsTool,
    getChannelTool,
    createChannelTool,
    deleteChannelTool,
    listChannelVideosTool,
    manageChannelVideoTool,
    listCategoriesTool,
    listCategoryVideosTool
  ],
  triggers: [videoEventsTrigger, newVideoTrigger]
});
