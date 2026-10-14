import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteJobResult,
  editImage,
  enhanceImage,
  faceSwap,
  generateImage,
  getAccountInfo,
  getJobResult,
  inpaintOutpaint,
  removeBackground,
  resizeImage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    enhanceImage,
    removeBackground,
    generateImage,
    faceSwap,
    inpaintOutpaint,
    resizeImage,
    getJobResult,
    deleteJobResult,
    getAccountInfo,
    editImage
  ],
  triggers: []
});
