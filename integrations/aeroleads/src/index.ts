import { Slate } from 'slates';
import { spec } from './spec';
import { findEmail, lookupLinkedInProfile } from './tools';

export let provider = Slate.create({
  spec,
  tools: [lookupLinkedInProfile, findEmail],
  triggers: []
});
