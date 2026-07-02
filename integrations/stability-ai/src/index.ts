import { Slate } from 'slates';
import { spec } from './spec';
import {
  controlImage,
  editImage,
  generate3D,
  generateAudio,
  generateImage,
  getAccount,
  replaceBackground,
  upscaleImage
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    editImage,
    upscaleImage,
    controlImage,
    replaceBackground,
    generateAudio,
    generate3D,
    getAccount
  ],
  triggers: []
});
