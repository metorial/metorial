import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDraftPost,
  getCases,
  getCurrentUser,
  getListeningMessages,
  getListeningMetrics,
  getMessages,
  getMetadata,
  getPostAnalytics,
  getProfileAnalytics,
  getPublishingPost,
  listCustomers,
  uploadMedia
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCustomers.build(),
    getCurrentUser.build(),
    getMetadata.build(),
    getProfileAnalytics.build(),
    getPostAnalytics.build(),
    getMessages.build(),
    createDraftPost.build(),
    uploadMedia.build(),
    getListeningMessages.build(),
    getListeningMetrics.build(),
    getCases.build(),
    getPublishingPost.build()
  ],
  triggers: []
});
