import { Slate } from 'slates';
import { spec } from './spec';
import {
  createPost,
  createTag,
  deleteMediaFiles,
  deletePosts,
  deleteTag,
  getAccount,
  getMediaFile,
  getPost,
  getTag,
  listAccounts,
  listAutoresponders,
  listMedia,
  listPosts,
  listReports,
  listTags,
  schedulePost,
  updatePost,
  uploadMedia
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createPost,
    updatePost,
    getPost,
    listPosts,
    schedulePost,
    deletePosts,
    listAccounts,
    getAccount,
    getTag,
    uploadMedia,
    listMedia,
    getMediaFile,
    deleteMediaFiles,
    createTag,
    listTags,
    deleteTag,
    listReports,
    listAutoresponders
  ],
  triggers: []
});
