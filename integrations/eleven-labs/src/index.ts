import { Slate } from 'slates';
import { spec } from './spec';
import {
  composeMusic,
  createDialogue,
  createDubbing,
  createForcedAlignment,
  deleteDubbing,
  deleteVoice,
  editVoiceSettings,
  generateSoundEffect,
  getAccount,
  getDubbing,
  getHistoryAudio,
  getVoice,
  isolateAudio,
  listHistory,
  listModels,
  listVoices,
  speechToText,
  textToSpeech,
  voiceChanger
} from './tools';
import { speechToTextCompletion, voiceAgentCall, voiceRemoval } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    textToSpeech,
    speechToText,
    listVoices,
    getVoice,
    deleteVoice,
    editVoiceSettings,
    voiceChanger,
    createDialogue,
    generateSoundEffect,
    composeMusic,
    createDubbing,
    getDubbing,
    deleteDubbing,
    isolateAudio,
    createForcedAlignment,
    listModels,
    listHistory,
    getHistoryAudio,
    getAccount
  ],
  triggers: [voiceAgentCall, speechToTextCompletion, voiceRemoval]
});
