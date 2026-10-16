import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadDocument,
  getCurrentUser,
  getExtractedData,
  listExtractors,
  listFolders,
  uploadDocument
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listExtractors,
    listFolders,
    uploadDocument,
    getExtractedData,
    getCurrentUser,
    downloadDocument
  ],
  triggers: []
});
