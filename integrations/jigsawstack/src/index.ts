import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeSentiment,
  convertHtml,
  deleteFile,
  detectNsfw,
  detectObjects,
  extractFromImage,
  generateEmbedding,
  generateImage,
  geoSearch,
  getFile,
  predictTimeSeries,
  scrapeWeb,
  summarizeText,
  textToSql,
  transcribeAudio,
  translateText,
  validateContent,
  webSearch
} from './tools';
import { taskCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    scrapeWeb,
    webSearch,
    analyzeSentiment,
    translateText,
    summarizeText,
    extractFromImage,
    transcribeAudio,
    generateImage,
    textToSql,
    validateContent,
    detectNsfw,
    detectObjects,
    convertHtml,
    predictTimeSeries,
    generateEmbedding,
    geoSearch,
    getFile,
    deleteFile
  ],
  triggers: [taskCompleted]
});
