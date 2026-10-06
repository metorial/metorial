import { Slate } from 'slates';
import { spec } from './spec';
import {
  controlImage,
  editImage,
  generate3D,
  generate3DFile,
  generateImage,
  generateImageFile,
  generateVideo,
  getAccount,
  getGenerationResult,
  replaceBackground,
  transformImage,
  upscaleImage
} from './tools';

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
    getAccount,
    generateImageFile,
    transformImage,
    generate3DFile,
    getGenerationResult
  ],
  triggers: []
});
