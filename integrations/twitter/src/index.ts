import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createPost,
  deleteDirectMessage,
  deletePost,
  getDirectMessages,
  getPost,
  getTimeline,
  getUser,
  manageBlockMute,
  manageBookmark,
  manageFollow,
  manageLike,
  manageList,
  manageReplyVisibility,
  manageRetweet,
  searchPosts,
  sendDirectMessage,
  uploadMedia
} from './tools';
import {
  inboundWebhook,
  newDirectMessage,
  newFollower,
  newMention,
  newPostFromSearch
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createPost,
    deletePost,
    getPost,
    searchPosts,
    getTimeline,
    getUser,
    manageLike,
    manageRetweet,
    manageBookmark,
    manageFollow,
    manageBlockMute,
    sendDirectMessage,
    deleteDirectMessage,
    getDirectMessages,
    manageList,
    manageReplyVisibility,
    uploadMedia
  ],
  triggers: [inboundWebhook, newMention, newPostFromSearch, newFollower, newDirectMessage]
});
