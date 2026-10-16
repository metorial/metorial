import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseFolderTool,
  createAlbumTool,
  createNodeTool,
  deleteAlbumTool,
  deleteImageTool,
  deleteNodeTool,
  exportImageMetadataTool,
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
  updateProfileTool,
  uploadImageTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getUserTool,
    exportImageMetadataTool,
    updateProfileTool,
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
  triggers: []
});
