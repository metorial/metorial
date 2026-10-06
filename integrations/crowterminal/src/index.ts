import { Slate } from 'slates';
import { spec } from './spec';
import {
  createPost,
  deletePost,
  getPost,
  listAccounts,
  listPosts,
  manageSchedule,
  updatePost
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createPost,
    getPost,
    listPosts,
    updatePost,
    deletePost,
    listAccounts,
    manageSchedule
  ],
  triggers: []
});
