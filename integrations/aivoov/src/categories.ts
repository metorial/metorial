import { toolCategory } from 'slates';
import { createTranscription, generateAudio, getTranscription, listVoices } from './tools';

export let toolCategories = [
  toolCategory({
    key: 'text_to_speech',
    name: 'Text to Speech',
    description: 'Discover voices and generate spoken audio from text.',
    tools: [generateAudio, listVoices]
  }),
  toolCategory({
    key: 'speech_to_text',
    name: 'Speech to Text',
    description: 'Transcribe audio and retrieve transcripts and subtitles.',
    tools: [createTranscription, getTranscription]
  })
];
