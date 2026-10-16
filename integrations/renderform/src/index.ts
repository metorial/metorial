import { Slate } from 'slates';
import { spec } from './spec';
import {
  capturePdf,
  createTemplate,
  deleteResult,
  deleteTemplate,
  getAccountUsage,
  getResult,
  getTemplate,
  getTemplateContent,
  listResults,
  listTemplates,
  renderImage,
  takeScreenshot,
  updateTemplate,
  updateTemplateContent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    renderImage,
    takeScreenshot,
    listTemplates,
    getTemplate,
    listResults,
    capturePdf,
    getAccountUsage,
    getResult,
    deleteResult,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateContent,
    updateTemplateContent
  ],
  triggers: []
});
