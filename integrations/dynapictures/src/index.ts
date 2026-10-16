import { Slate } from 'slates';
import { spec } from './spec';
import {
  createWorkspace,
  deleteImage,
  deleteMediaAsset,
  deleteWorkspace,
  generateBatchPdf,
  generateImage,
  getAiGeneration,
  getMediaAsset,
  getTemplate,
  listMediaAssets,
  listTemplates,
  listWorkspaces,
  startAiGeneration,
  updateWorkspace,
  uploadMediaAsset
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    startAiGeneration,
    getAiGeneration,
    uploadMediaAsset,
    generateBatchPdf,
    listTemplates,
    getTemplate,
    deleteImage,
    listWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    listMediaAssets,
    getMediaAsset,
    deleteMediaAsset
  ],
  triggers: []
});
