import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDubbingTool,
  deleteVoiceTool,
  designVoiceTool,
  editVoiceTool,
  generateSoundEffectTool,
  getDubbingTool,
  getUserTool,
  getVoiceTool,
  isolateAudioTool,
  listHistoryTool,
  listModelsTool,
  listPronunciationDictionariesTool,
  listVoicesTool,
  speechToTextTool,
  textToSpeechTool
} from './tools';
import {
  conversationEventsTrigger,
  transcriptionCompletedTrigger,
  voiceEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    textToSpeechTool,
    speechToTextTool,
    listVoicesTool,
    getVoiceTool,
    editVoiceTool,
    deleteVoiceTool,
    designVoiceTool,
    generateSoundEffectTool,
    createDubbingTool,
    getDubbingTool,
    isolateAudioTool,
    listModelsTool,
    listHistoryTool,
    getUserTool,
    listPronunciationDictionariesTool
  ],
  triggers: [conversationEventsTrigger, voiceEventsTrigger, transcriptionCompletedTrigger]
});
