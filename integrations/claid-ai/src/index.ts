import { Slate } from 'slates';
import { spec } from './spec';
import {
  aiEditImage,
  editImage,
  generateBackground,
  generateFashionModel,
  generateImage,
  generateVideo,
  getAiEditStatus,
  getJobStatus,
  listStorageTypes,
  manageStorage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    editImage,
    generateImage,
    generateBackground,
    generateFashionModel,
    generateVideo,
    manageStorage,
    getJobStatus,
    aiEditImage,
    getAiEditStatus,
    listStorageTypes
  ],
  triggers: []
});
