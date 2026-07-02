import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTemplateTool,
  deleteAssetTool,
  deleteSourceTool,
  deleteTemplateTool,
  generateAssetTool,
  getAssetsByRenderIdTool,
  getAssetTool,
  getGeneratedAssetTool,
  getRenderTool,
  getSourceTool,
  getTemplateTool,
  ingestSourceTool,
  listSourcesTool,
  listTemplatesTool,
  probeMediaTool,
  renderTemplateTool,
  renderVideoTool,
  requestUploadUrlTool,
  transferAssetTool,
  updateTemplateTool
} from './tools';
import { shotstackEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    renderVideoTool,
    getRenderTool,
    createTemplateTool,
    listTemplatesTool,
    getTemplateTool,
    updateTemplateTool,
    deleteTemplateTool,
    renderTemplateTool,
    probeMediaTool,
    getAssetTool,
    getAssetsByRenderIdTool,
    deleteAssetTool,
    transferAssetTool,
    ingestSourceTool,
    getSourceTool,
    listSourcesTool,
    deleteSourceTool,
    requestUploadUrlTool,
    generateAssetTool,
    getGeneratedAssetTool
  ],
  triggers: [shotstackEventsTrigger]
});
