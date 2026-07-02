import { Slate } from 'slates';
import { spec } from './spec';
import {
  controlImage,
  editImage,
  generate3D,
  generateImage,
  generateVideo,
  getAccount,
  replaceBackground,
  upscaleImage
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    editImage,
    replaceBackground,
    upscaleImage,
    controlImage,
    generateVideo,
    generate3D,
    getAccount
  ],
  triggers: [inboundWebhook]
});
