import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkStatus,
  deleteTemplate,
  downloadDocument,
  downloadTemplate,
  listCategoriesAndTags,
  listTemplates,
  renderDocument,
  updateTemplate,
  uploadTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    uploadTemplate,
    listTemplates,
    updateTemplate,
    deleteTemplate,
    downloadTemplate,
    downloadDocument,
    renderDocument,
    checkStatus,
    listCategoriesAndTags
  ],
  triggers: []
});
