import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteTemplate,
  getEnvironmentStatus,
  getRenderTags,
  getTemplateDetails,
  getTemplateStructure,
  listTemplates,
  renderDocument
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
    getRenderTags
  ],
  triggers: []
});
