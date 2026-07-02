import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  getContentInfo,
  getPost,
  getSubreddit,
  getUser,
  listUserContent,
  manageComment,
  manageFlair,
  manageMessages,
  managePost,
  manageSubscriptions,
  manageWiki,
  moderateContent,
  saveContent,
  searchReddit,
  submitComment,
  submitPost,
  vote
} from './tools';
import { inboundWebhook, newComment, newMessage, newPost } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getSubreddit,
    getPost,
    getContentInfo,
    searchReddit,
    listUserContent,
    submitPost,
    managePost,
    submitComment,
    manageComment,
    vote,
    saveContent,
    getUser,
    manageMessages,
    manageSubscriptions,
    moderateContent,
    manageFlair,
    manageWiki
  ],
  triggers: [inboundWebhook, newPost, newComment, newMessage]
});
