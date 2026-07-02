import { Slate } from 'slates';
import { spec } from './spec';
import {
  autofillBrandTemplate,
  createComment,
  createDesign,
  createFolder,
  deleteAsset,
  deleteFolder,
  exportDesign,
  getAsset,
  getBrandTemplate,
  getCommentThread,
  getDesign,
  getExportJob,
  getFolder,
  getImportJob,
  getUserProfile,
  importDesign,
  listBrandTemplates,
  listDesigns,
  listFolderItems,
  moveFolderItem,
  updateAsset,
  updateFolder,
  uploadAsset
} from './tools';
import { designNotification } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getUserProfile,
    getAsset,
    updateAsset,
    deleteAsset,
    uploadAsset,
    listDesigns,
    getDesign,
    createDesign,
    exportDesign,
    getExportJob,
    importDesign,
    getImportJob,
    getFolder,
    createFolder,
    updateFolder,
    deleteFolder,
    listFolderItems,
    moveFolderItem,
    createComment,
    getCommentThread,
    listBrandTemplates,
    getBrandTemplate,
    autofillBrandTemplate
  ],
  triggers: [designNotification]
});
