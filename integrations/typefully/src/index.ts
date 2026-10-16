import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCommentThread,
  createDraft,
  deleteDraft,
  getCurrentUser,
  getDraft,
  getQueue,
  getQueueSchedule,
  getSocialSet,
  listCommentThreads,
  listDrafts,
  listSocialSets,
  manageTags,
  replaceQueueSchedule,
  replyToCommentThread,
  resolveCommentThread,
  updateDraft,
  updateMedia,
  uploadMedia
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createDraft,
    listDrafts,
    getDraft,
    updateDraft,
    deleteDraft,
    listSocialSets,
    manageTags,
    uploadMedia,
    getCurrentUser,
    getSocialSet,
    getQueue,
    getQueueSchedule,
    replaceQueueSchedule,
    updateMedia,
    listCommentThreads,
    createCommentThread,
    replyToCommentThread,
    resolveCommentThread
  ],
  triggers: []
});
