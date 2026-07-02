import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseFolderTool,
  createAlbumTool,
  createNodeTool,
  deleteAlbumTool,
  deleteImageTool,
  deleteNodeTool,
  getAlbumTool,
  getCommentsTool,
  getImageTool,
  getNodeTool,
  getShareUrisTool,
  getUserTool,
  getWatermarksTool,
  listAlbumImagesTool,
  moveImagesTool,
  searchTool,
  updateAlbumTool,
  updateImageTool,
  updateNodeTool,
  uploadImageTool
} from './tools';
import { albumUpdatedTrigger, inboundWebhook, newImagesTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getUserTool,
    createAlbumTool,
    updateAlbumTool,
    deleteAlbumTool,
    getAlbumTool,
    getImageTool,
    updateImageTool,
    deleteImageTool,
    uploadImageTool,
    moveImagesTool,
    getNodeTool,
    createNodeTool,
    updateNodeTool,
    deleteNodeTool,
    searchTool,
    listAlbumImagesTool,
    getCommentsTool,
    getWatermarksTool,
    getShareUrisTool,
    browseFolderTool
  ],
  triggers: [inboundWebhook, newImagesTrigger, albumUpdatedTrigger]
});
