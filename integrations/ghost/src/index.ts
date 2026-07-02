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
  getSite,
  manageMember,
  manageNewsletter,
  manageOffer,
  managePage,
  managePost,
  manageTag,
  manageWebhook
} from './tools';
import { memberEvents, pageEvents, postEvents, siteChanged, tagEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  ],
  triggers: [postEvents, pageEvents, tagEvents, memberEvents, siteChanged]
});
