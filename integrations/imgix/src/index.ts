import { Slate } from 'slates';
import { spec } from './spec';
import {
  addAsset,
  buildRenderUrl,
  createSource,
  downloadAsset,
  generateSignedUrl,
  getAsset,
  getFileUrl,
  getReports,
  getSource,
  listAssets,
  listSources,
  purgeCache,
  refreshAsset,
  updateAsset,
  updateSource
} from './tools';
export const provider = Slate.create({
  spec,
  tools: [
    listSources,
    getSource,
    createSource,
    updateSource,
    listAssets,
    getAsset,
    updateAsset,
    refreshAsset,
    purgeCache,
    getReports,
    generateSignedUrl,
    buildRenderUrl,
    addAsset,
    downloadAsset,
    getFileUrl
  ],
  triggers: []
});
