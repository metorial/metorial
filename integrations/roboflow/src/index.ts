import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAnnotationJobTool,
  createProjectTool,
  createVersionTool,
  deleteImagesTool,
  exportDatasetTool,
  getImageTool,
  getProjectTool,
  getVersionTool,
  listAnnotationJobsTool,
  listProjectsTool,
  manageImageTagsTool,
  runInferenceTool,
  searchImagesTool,
  trainModelTool,
  uploadAnnotationTool,
  uploadImageTool
} from './tools';
import { batchWebhookTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjectsTool,
    getProjectTool,
    createProjectTool,
    uploadImageTool,
    getImageTool,
    searchImagesTool,
    manageImageTagsTool,
    deleteImagesTool,
    getVersionTool,
    createVersionTool,
    trainModelTool,
    runInferenceTool,
    listAnnotationJobsTool,
    createAnnotationJobTool,
    exportDatasetTool,
    uploadAnnotationTool
  ],
  triggers: [batchWebhookTrigger]
});
