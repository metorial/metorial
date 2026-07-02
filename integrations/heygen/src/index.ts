import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAvatarVideo,
  createStreamingToken,
  createVideoFromPrompt,
  deleteAsset,
  deleteVideo,
  generateFromTemplate,
  generateSpeech,
  getRemainingQuota,
  getTemplate,
  getTranslationStatus,
  getVideoStatus,
  listAssets,
  listAvatars,
  listTalkingPhotos,
  listTemplates,
  listVideos,
  listVoices,
  translateVideo,
  uploadAsset
} from './tools';
import { videoEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createAvatarVideo,
    getVideoStatus,
    listAvatars,
    listVoices,
    listVideos,
    deleteVideo,
    createVideoFromPrompt,
    generateFromTemplate,
    listTemplates,
    getTemplate,
    translateVideo,
    getTranslationStatus,
    generateSpeech,
    createStreamingToken,
    listAssets,
    uploadAsset,
    deleteAsset,
    getRemainingQuota,
    listTalkingPhotos
  ],
  triggers: [videoEvents]
});
