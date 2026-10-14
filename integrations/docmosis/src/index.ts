import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteTemplate,
  downloadTemplate,
  getEnvironmentStatus,
  getRenderTags,
  getTemplateDetails,
  getTemplateStructure,
  listTemplates,
  renderDocument,
  uploadTemplate
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    renderDocument,
    listTemplates,
    deleteTemplate,
    getTemplateStructure,
    getTemplateDetails,
    getEnvironmentStatus,
    getRenderTags,
    uploadTemplate,
    downloadTemplate
  ],
  triggers: []
});
