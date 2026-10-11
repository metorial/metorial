import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAnnotationJobTool,
  createProjectTool,
  createVersionTool,
  deleteImagesTool,
  deleteProjectTool,
  exportDatasetTool,
  getImageTool,
  getProjectTool,
  getVersionTool,
  listAnnotationJobsTool,
  listBatchesTool,
  listModelsTool,
  listProjectsTool,
  manageImageTagsTool,
  runInferenceTool,
  searchImagesTool,
  stopTrainingTool,
  trainModelTool,
  uploadAnnotationTool,
  uploadImageTool,
  whoAmITool
} from './tools';

export let provider = Slate.create({
  spec,
  triggers: [],
  tools: [
    listProjectsTool,
    whoAmITool,
    listBatchesTool,
    deleteProjectTool,
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
    stopTrainingTool,
    listModelsTool,
    runInferenceTool,
    listAnnotationJobsTool,
    createAnnotationJobTool,
    exportDatasetTool,
    uploadAnnotationTool
  ]
});
