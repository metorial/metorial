import { Slate } from 'slates';
import { spec } from './spec';
import {
  chatCompletion,
  contextualAnswer,
  conversationalRag,
  deleteFile,
  downloadFile,
  getFile,
  getFileUrl,
  getMaestroRun,
  grammarCheck,
  listFiles,
  maestroRun,
  paraphrase,
  segmentText,
  summarize,
  summarizeBySegment,
  textCompletion,
  textImprovements,
  updateFile,
  uploadFile
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    chatCompletion,
    maestroRun,
    getMaestroRun,
    conversationalRag,
    uploadFile,
    downloadFile,
    getFileUrl,
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
  triggers: []
});
