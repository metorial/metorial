import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeSentiment,
  classifyContent,
  convertHtml,
  deleteFile,
  detectNsfw,
  detectObjects,
  extractFromImage,
  generateEmbedding,
  generateEmbeddingV2,
  generateImage,
  geoSearch,
  getFile,
  predictTimeSeries,
  scrapeWeb,
  searchSuggestions,
  summarizeText,
  textToSql,
  transcribeAudio,
  translateText,
  validateContent,
  webSearch
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    scrapeWeb,
    classifyContent,
    generateEmbeddingV2,
    searchSuggestions,
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
  triggers: []
});
