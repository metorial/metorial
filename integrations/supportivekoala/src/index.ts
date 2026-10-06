import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTemplate,
  generateImage,
  getImage,
  getTemplate,
  listImages,
  listTemplates,
  updateTemplate
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    getImage,
    listImages,
    createTemplate,
    updateTemplate,
    getTemplate,
    listTemplates
  ],
  triggers: []
});
