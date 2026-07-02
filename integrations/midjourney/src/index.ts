import { Slate } from 'slates';
import { spec } from './spec';
import {
  blendImages,
  createVariations,
  describeImage,
  fetchTask,
  generateImage,
  upscaleImage
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    createVariations,
    upscaleImage,
    blendImages,
    describeImage,
    fetchTask
  ],
  triggers: [inboundWebhook]
});
