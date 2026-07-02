import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseGallery,
  createRender,
  createTemplate,
  deleteFonts,
  deleteRender,
  deleteTemplate,
  deleteUploads,
  duplicateTemplate,
  getAccount,
  getTemplate,
  listFolders,
  listFonts,
  listRenders,
  listTemplates,
  listUploads,
  manageFolder,
  mergeRenders,
  updateTemplate
} from './tools';
import { editorEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createRender,
    listRenders,
    deleteRender,
    mergeRenders,
    listTemplates,
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
  triggers: [editorEvent]
});
