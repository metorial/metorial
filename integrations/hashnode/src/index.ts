import { Slate } from 'slates';
import { spec } from './spec';
import {
  deletePost,
  getPost,
  getPublication,
  getUser,
  listPosts,
  listPublications,
  listStaticPages,
  manageComments,
  manageDraft,
  manageSeries,
  publishPost,
  searchPosts,
  subscribeNewsletter,
  updatePost
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getPost,
    listPosts,
    listPublications,
    publishPost,
    updatePost,
    deletePost,
    manageDraft,
    getPublication,
    manageSeries,
    manageComments,
    getUser,
    searchPosts,
    listStaticPages,
    subscribeNewsletter
  ],
  triggers: []
});

export { z } from 'zod';
