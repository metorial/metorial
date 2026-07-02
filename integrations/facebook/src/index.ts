import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  getAdInsights,
  getLeads,
  getPageInsights,
  getPostInsights,
  getPosts,
  getReactions,
  getUserProfile,
  listPages,
  manageComments,
  managePost,
  publishContent,
  searchFacebook,
  sendPageMessage
} from './tools';
import { newLead, newPagePost, pageWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getUserProfile,
    listPages,
    getPosts,
    publishContent,
    managePost,
    manageComments,
    getPageInsights,
    getPostInsights,
    getReactions,
    searchFacebook,
    getAdInsights,
    getLeads,
    sendPageMessage
  ],
  triggers: [pageWebhook, newPagePost, newLead]
});
