import { Slate } from 'slates';
import { spec } from './spec';
import { createAttachments } from './tools';

export let provider = Slate.create({
  spec,
  tools: [createAttachments],
  triggers: []
});
