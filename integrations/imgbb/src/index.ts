import { Slate } from 'slates';
import { spec } from './spec';
import { uploadImage } from './tools';

export let provider = Slate.create({
  spec,
  tools: [uploadImage],
  triggers: []
});
