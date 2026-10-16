import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTemplate,
  deleteImages,
  downloadImage,
  generateImage,
  generateImageFromTemplate,
  getUsage,
  listImages,
  listTemplates,
  requestImageDeletion,
  updateTemplate
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    generateImageFromTemplate,
    getUsage,
    listImages,
    deleteImages,
    requestImageDeletion,
    downloadImage,
    createTemplate,
    updateTemplate,
    listTemplates
  ],
  triggers: []
});
