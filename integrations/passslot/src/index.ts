import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTemplate,
  deletePass,
  deleteTemplate,
  downloadPass,
  emailPass,
  generatePass,
  getPass,
  getScanner,
  getTemplate,
  getTemplateSettings,
  listPasses,
  listPassTypes,
  listScanners,
  listTemplates,
  manageScanner,
  updatePass,
  updateTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generatePass,
    downloadPass,
    listPasses,
    getPass,
    updatePass,
    deletePass,
    emailPass,
    listPassTypes,
    getTemplateSettings,
    manageScanner,
    getScanner,
    listScanners
  ],
  triggers: []
});
