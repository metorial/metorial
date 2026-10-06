import { Slate } from 'slates';
import { spec } from './spec';
import { createPost, getProfile, initializeImageUpload } from './tools';

export let provider = Slate.create({
  spec,
  tools: [getProfile, createPost, initializeImageUpload],
  triggers: []
});
