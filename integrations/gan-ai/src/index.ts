import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAvatar,
  createLipsync,
  createPersonalizedVideos,
  createPhotoAvatar,
  deleteAvatars,
  deleteLipsyncs,
  generateAvatarVideo,
  generatePhotoAvatarVideo,
  generateSoundEffect,
  generateSpeech,
  getAvatarInference,
  getPhotoAvatarInferences,
  getSfxHistory,
  getTtsHistory,
  getVideoStatus,
  listAvatars,
  listLipsyncs,
  listPhotoAvatars,
  listProjects,
  listVoices,
  listWorkspaces,
  manageConsent
} from './tools';
import { playgroundWebhook, studioVideoWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listVoices,
    generateSpeech,
    getTtsHistory,
    createAvatar,
    listAvatars,
    generateAvatarVideo,
    getAvatarInference,
    deleteAvatars,
    manageConsent,
    createPhotoAvatar,
    listPhotoAvatars,
    generatePhotoAvatarVideo,
    getPhotoAvatarInferences,
    createLipsync,
    listLipsyncs,
    deleteLipsyncs,
    generateSoundEffect,
    getSfxHistory,
    listWorkspaces,
    listProjects,
    createPersonalizedVideos,
    getVideoStatus
  ],
  triggers: [playgroundWebhook, studioVideoWebhook]
});
