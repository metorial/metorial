import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDraft,
  deleteDraft,
  getDraft,
  listDrafts,
  listSocialSets,
  manageTags,
  updateDraft,
  uploadMedia
} from './tools';
import { draftEvents } from './triggers';

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
    uploadMedia
  ],
  triggers: [draftEvents]
});
