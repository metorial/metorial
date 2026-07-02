import { Slate } from 'slates';
import { spec } from './spec';
import { generateAltText, getAccount, getImage, listImages, searchImages } from './tools';
import { altTextGenerated, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [generateAltText, getAccount, getImage, listImages, searchImages],
  triggers: [inboundWebhook, altTextGenerated]
});
