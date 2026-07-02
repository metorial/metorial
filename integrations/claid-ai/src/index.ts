import { Slate } from 'slates';
import { spec } from './spec';
import {
  editImage,
  generateBackground,
  generateFashionModel,
  generateImage,
  generateVideo,
  getJobStatus,
  manageStorage
} from './tools';
import { asyncJobCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    editImage,
    generateImage,
    generateBackground,
    generateFashionModel,
    generateVideo,
    manageStorage,
    getJobStatus
  ],
  triggers: [asyncJobCompleted]
});
