import { Slate } from 'slates';
import { spec } from './spec';
import {
  composeMusic,
  createDubbing,
  deleteVoice,
  editVoiceSettings,
  generateSoundEffect,
  getAccount,
  getDubbing,
  getVoice,
  isolateAudio,
  listHistory,
  listModels,
  listVoices,
  speechToText,
  textToSpeech
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
    generateSoundEffect,
    composeMusic,
    createDubbing,
    getDubbing,
    isolateAudio,
    listModels,
    listHistory,
    getAccount
  ],
  triggers: [voiceAgentCall, speechToTextCompletion, voiceRemoval]
});
