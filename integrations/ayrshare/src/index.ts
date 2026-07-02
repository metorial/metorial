import { Slate } from 'slates';
import { spec } from './spec';
import {
  addFeed,
  createPost,
  createProfile,
  deleteComment,
  deleteFeed,
  deletePost,
  deleteProfile,
  generateHashtags,
  getComments,
  getFeeds,
  getMessages,
  getPostAnalytics,
  getPostHistory,
  getProfiles,
  getReviews,
  getSocialAnalytics,
  postComment,
  sendMessage,
  updatePost,
  uploadMedia,
  validatePost
} from './tools';
import {
  feedTrigger,
  messagesTrigger,
  scheduledPostTrigger,
  socialAccountTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createPost,
    deletePost,
    updatePost,
    getPostHistory,
    getPostAnalytics,
    getSocialAnalytics,
    getComments,
    postComment,
    deleteComment,
    sendMessage,
    getMessages,
    uploadMedia,
    generateHashtags,
    createProfile,
    getProfiles,
    deleteProfile,
    getReviews,
    validatePost,
    addFeed,
    getFeeds,
    deleteFeed
  ],
  triggers: [scheduledPostTrigger, socialAccountTrigger, messagesTrigger, feedTrigger]
});
