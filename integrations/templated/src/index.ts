import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseGallery,
  createRender,
  createTemplate,
  createTemplateFromRender,
  deleteFonts,
  deleteRender,
  deleteTemplate,
  deleteUploads,
  duplicateRender,
  duplicateTemplate,
  getAccount,
  getRender,
  getTemplate,
  listFolders,
  listFonts,
  listRenders,
  listTemplatePages,
  listTemplates,
  listUploads,
  manageFolder,
  mergeRenders,
  updateTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createRender,
    getRender,
    duplicateRender,
    createTemplateFromRender,
    listRenders,
    deleteRender,
    mergeRenders,
    listTemplates,
    listTemplatePages,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    browseGallery,
    manageFolder,
    listFolders,
    listUploads,
    deleteUploads,
    listFonts,
    deleteFonts,
    getAccount
  ],
  triggers: []
});
