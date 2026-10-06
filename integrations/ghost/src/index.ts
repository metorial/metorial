import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseMembers,
  browseNewsletters,
  browsePages,
  browsePosts,
  browseTags,
  browseTiers,
  browseUsers,
  exportContent,
  getCurrentContext,
  getResource,
  getSite,
  manageMember,
  manageNewsletter,
  manageOffer,
  managePage,
  managePost,
  manageTag,
  manageWebhook
} from './tools';
export let provider = Slate.create({
  spec,
  triggers: [],
  tools: [
    getCurrentContext,
    getResource,
    exportContent,
    browsePosts,
    managePost,
    browsePages,
    managePage,
    browseTags,
    manageTag,
    browseMembers,
    manageMember,
    browseNewsletters,
    manageNewsletter,
    browseTiers,
    manageOffer,
    browseUsers,
    getSite,
    manageWebhook
  ]
});
