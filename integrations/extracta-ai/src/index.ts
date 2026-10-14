import { Slate } from 'slates';
import { spec } from './spec';
import {
  createClassificationTool,
  createExtractionTool,
  deleteClassificationBatchTool,
  deleteClassificationFilesTool,
  deleteClassificationTool,
  deleteExtractionTool,
  getClassificationResultsTool,
  getCreditsTool,
  getExtractionResultsTool,
  updateClassificationTool,
  updateExtractionTool,
  uploadClassificationFilesTool,
  uploadExtractionFilesTool,
  viewClassificationTool,
  viewExtractionTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createExtractionTool,
    viewExtractionTool,
    updateExtractionTool,
    deleteExtractionTool,
    uploadExtractionFilesTool,
    getExtractionResultsTool,
    createClassificationTool,
    viewClassificationTool,
    updateClassificationTool,
    deleteClassificationTool,
    deleteClassificationBatchTool,
    deleteClassificationFilesTool,
    uploadClassificationFilesTool,
    getClassificationResultsTool,
    getCreditsTool
  ],
  triggers: []
});
