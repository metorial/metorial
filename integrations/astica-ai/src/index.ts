import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeImageTool,
  generateImageTool,
  generateTextTool,
  listVoicesTool,
  speechToTextTool,
  textToSpeechTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    analyzeImageTool,
    generateImageTool,
    textToSpeechTool,
    speechToTextTool,
    generateTextTool,
    listVoicesTool
  ],
  triggers: [inboundWebhook]
});
