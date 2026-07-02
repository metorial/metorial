import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDraftPost,
  getCases,
  getListeningMessages,
  getListeningMetrics,
  getMessages,
  getMetadata,
  getPostAnalytics,
  getProfileAnalytics,
  getPublishingPost,
  uploadMedia
} from './tools';
import { inboundWebhook, newCases, newMessages } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, newMessages.build(), newCases.build()]
});
