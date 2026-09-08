import { Slate } from 'slates';
import { spec } from './spec';
import { createAttachments, getFileUrl } from './tools';

export let provider = Slate.create({
  spec,
  tools: [createAttachments, getFileUrl],
  triggers: []
});
