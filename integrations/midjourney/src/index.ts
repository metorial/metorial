import { Slate } from 'slates';
import { spec } from './spec';
import {
  blendImages,
  createVariations,
  describeImage,
  extendVideo,
  fetchManyTasks,
  fetchTask,
  generateImage,
  generateVideo,
  getAccountInfo,
  getSeed,
  inpaintImage,
  panImage,
  rerollImage,
  upscaleImage,
  zoomOutImage
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
    fetchTask,
    rerollImage,
    panImage,
    zoomOutImage,
    inpaintImage,
    getSeed,
    fetchManyTasks,
    getAccountInfo,
    generateVideo,
    extendVideo
  ],
  triggers: [inboundWebhook]
});
