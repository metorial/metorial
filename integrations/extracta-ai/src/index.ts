import { Slate } from 'slates';
import { spec } from './spec';
import {
  createClassificationTool,
  createExtractionTool,
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
import { extractionEventsTrigger } from './triggers';

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
    uploadClassificationFilesTool,
    getClassificationResultsTool,
    getCreditsTool
  ],
  triggers: [extractionEventsTrigger]
});
