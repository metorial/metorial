import { Slate } from 'slates';
import { spec } from './spec';
import { generateAltText, getAccount, getImage, listImages, searchImages } from './tools';
export let provider = Slate.create({
  spec,
  tools: [generateAltText, getAccount, getImage, listImages, searchImages],
  triggers: []
});
