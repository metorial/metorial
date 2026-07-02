import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCategoryTool,
  createCommentTool,
  createPageTool,
  createPostTool,
  createTagTool,
  deleteCategoryTool,
  deleteCommentTool,
  deleteMediaTool,
  deletePageTool,
  deletePostTool,
  deleteTagTool,
  getCurrentUserTool,
  getMediaTool,
  getPostTool,
  getSiteInfoTool,
  getSiteStatsTool,
  listCategoriesTool,
  listCommentsTool,
  listMediaTool,
  listPagesTool,
  listPostsTool,
  listTagsTool,
  listUsersTool,
  moderateCommentTool,
  searchContentTool,
  updateMediaTool,
  updatePageTool,
  updatePostTool
} from './tools';
import {
  inboundWebhook,
  newCommentTrigger,
  pageChangesTrigger,
  postChangesTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listPostsTool,
    getPostTool,
    createPostTool,
    updatePostTool,
    deletePostTool,
    listPagesTool,
    createPageTool,
    updatePageTool,
    deletePageTool,
    listCommentsTool,
    createCommentTool,
    moderateCommentTool,
    deleteCommentTool,
    listMediaTool,
    getMediaTool,
    updateMediaTool,
    deleteMediaTool,
    listCategoriesTool,
    createCategoryTool,
    deleteCategoryTool,
    listTagsTool,
    createTagTool,
    deleteTagTool,
    listUsersTool,
    getCurrentUserTool,
    getSiteInfoTool,
    getSiteStatsTool,
    searchContentTool
  ],
  triggers: [inboundWebhook, postChangesTrigger, newCommentTrigger, pageChangesTrigger]
});
