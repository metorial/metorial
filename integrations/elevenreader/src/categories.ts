import { toolCategory } from 'slates';
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

export let toolCategories = [
  toolCategory({
    key: 'text-to-speech',
    name: 'Text to Speech and Voices',
    description:
      'Speech generation, voice discovery and design, pronunciation dictionaries, and audio history.',
    tools: [
      generateSpeechTool,
      textToSpeechTool,
      listVoicesTool,
      getVoiceTool,
      editVoiceTool,
      deleteVoiceTool,
      designVoicePreviewsTool,
      designVoiceTool,
      createVoiceFromPreviewTool,
      listModelsTool,
      listPronunciationDictionariesTool,
      listHistoryTool,
      downloadHistoryAudioTool
    ]
  }),
  toolCategory({
    key: 'speech-to-text',
    name: 'Speech to Text',
    description: 'Synchronous audio transcription with optional diarization and timestamps.',
    tools: [speechToTextTool]
  }),
  toolCategory({
    key: 'sound-effects',
    name: 'Sound Effects',
    description: 'Sound effect generation from text prompts.',
    tools: [generateSoundEffectFileTool, generateSoundEffectTool]
  }),
  toolCategory({
    key: 'audio-isolation',
    name: 'Audio Isolation',
    description: 'Vocal isolation and background noise removal.',
    tools: [isolateAudioFileTool, isolateAudioTool]
  }),
  toolCategory({
    key: 'dubbing',
    name: 'Automatic Dubbing',
    description:
      'Create automatic dubs, check progress, download original results, and delete projects.',
    tools: [createDubbingTool, getDubbingTool, downloadDubbingAudioTool, deleteDubbingTool]
  })
];
