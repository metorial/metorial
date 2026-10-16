import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  createDubbingTool,
  createVoiceFromPreviewTool,
  deleteDubbingTool,
  deleteVoiceTool,
  designVoicePreviewsTool,
  designVoiceTool,
  downloadDubbingAudioTool,
  downloadHistoryAudioTool,
  editVoiceTool,
  generateSoundEffectFileTool,
  generateSoundEffectTool,
  generateSpeechTool,
  getDubbingTool,
  getUserTool,
  getVoiceTool,
  isolateAudioFileTool,
  isolateAudioTool,
  listHistoryTool,
  listModelsTool,
  listPronunciationDictionariesTool,
  listVoicesTool,
  speechToTextTool,
  textToSpeechTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    generateSpeechTool,
    generateSoundEffectFileTool,
    isolateAudioFileTool,
    designVoicePreviewsTool,
    createVoiceFromPreviewTool,
    downloadHistoryAudioTool,
    downloadDubbingAudioTool,
    deleteDubbingTool,
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
  toolCategories,
  triggers: []
});
