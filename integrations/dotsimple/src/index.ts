import { Slate } from 'slates';
import { spec } from './spec';
import {
  createPost,
  createTag,
  deleteMediaFiles,
  deletePosts,
  deleteTag,
  getMediaFile,
  getPost,
  listAccounts,
  listAutoresponders,
  listMedia,
  listPosts,
  listReports,
  listTags,
  schedulePost,
  updatePost
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
