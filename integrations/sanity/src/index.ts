import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadAsset,
  getCurrentUser,
  getDocument,
  listProjects,
  manageDatasets,
  manageWebhooks,
  mutateDocuments,
  queryDocuments,
  uploadAsset
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    queryDocuments,
    getDocument,
    mutateDocuments,
    listProjects,
    manageDatasets,
    manageWebhooks,
    uploadAsset,
    getCurrentUser,
    downloadAsset
  ],
  triggers: []
});
