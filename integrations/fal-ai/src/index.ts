import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkQueueStatus,
  generateImage,
  generateSpeech,
  generateVideo,
  runModel,
  searchModels,
  submitQueueRequest,
  transcribeAudio,
  uploadFile
} from './tools';
import { queueCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    generateVideo,
    transcribeAudio,
    generateSpeech,
    searchModels,
    submitQueueRequest,
    checkQueueStatus,
    uploadFile,
    runModel
  ],
  triggers: [queueCompleted]
});
