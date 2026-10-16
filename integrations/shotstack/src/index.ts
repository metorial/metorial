import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  createTemplateTool,
  deleteAssetTool,
  deleteSourceTool,
  deleteTemplateTool,
  generateAssetTool,
  generateTool,
  getAssetsByRenderIdTool,
  getAssetTool,
  getGeneratedAssetTool,
  getGenerationModelTool,
  getGenerationTool,
  getRenderTool,
  getSourceTool,
  getTemplateTool,
  ingestSourceTool,
  listGenerationModelsTool,
  listSourcesTool,
  listTemplatesTool,
  probeMediaTool,
  quoteGenerationTool,
  renderTemplateTool,
  renderVideoTool,
  requestUploadUrlTool,
  transferAssetTool,
  updateTemplateTool
} from './tools';
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
    getGeneratedAssetTool,
    generateTool,
    getGenerationTool,
    quoteGenerationTool,
    listGenerationModelsTool,
    getGenerationModelTool
  ],
  toolCategories: [
    toolCategory({
      key: 'edit',
      name: 'Edit API',
      description: 'Render edits, manage templates, inspect media, and generate media.',
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
        generateTool,
        getGenerationTool,
        quoteGenerationTool,
        listGenerationModelsTool,
        getGenerationModelTool
      ]
    }),
    toolCategory({
      key: 'serve',
      name: 'Serve API',
      description: 'Retrieve, transfer, and delete hosted media.',
      tools: [getAssetTool, getAssetsByRenderIdTool, deleteAssetTool, transferAssetTool]
    }),
    toolCategory({
      key: 'ingest',
      name: 'Ingest API',
      description: 'Import and manage source media and request direct uploads.',
      tools: [
        ingestSourceTool,
        getSourceTool,
        listSourcesTool,
        deleteSourceTool,
        requestUploadUrlTool
      ]
    }),
    toolCategory({
      key: 'create',
      name: 'Create API',
      description: 'Use the provider-based Create API generation workflow.',
      tools: [generateAssetTool, getGeneratedAssetTool]
    })
  ],
  triggers: []
});
