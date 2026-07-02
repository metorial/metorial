import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTemplate,
  deletePass,
  deleteTemplate,
  emailPass,
  generatePass,
  getPass,
  getTemplate,
  listPasses,
  listPassTypes,
  listScanners,
  listTemplates,
  manageScanner,
  updatePass,
  updateTemplate
} from './tools';
import { passEvents, registrationEvents, scanEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generatePass,
    listPasses,
    getPass,
    updatePass,
    deletePass,
    emailPass,
    listPassTypes,
    manageScanner,
    listScanners
  ],
  triggers: [passEvents, registrationEvents, scanEvents]
});
