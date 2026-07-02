import { Slate } from 'slates';
import { spec } from './spec';
import {
  chatCompletion,
  contextualAnswer,
  conversationalRag,
  deleteFile,
  getFile,
  grammarCheck,
  listFiles,
  maestroRun,
  paraphrase,
  segmentText,
  summarize,
  summarizeBySegment,
  textCompletion,
  textImprovements,
  updateFile
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    chatCompletion,
    maestroRun,
    conversationalRag,
    listFiles,
    getFile,
    updateFile,
    deleteFile,
    summarize,
    summarizeBySegment,
    paraphrase,
    textImprovements,
    grammarCheck,
    segmentText,
    contextualAnswer,
    textCompletion
  ],
  triggers: [inboundWebhook]
});
