import { Slate } from 'slates';
import { spec } from './spec';
import {
  aiSearch,
  callModule,
  convertDocument,
  deepResearch,
  extractIdData,
  generateBusinessReport,
  generateSocialMediaContent,
  imageToJson,
  listModules,
  pdfToJson,
  textToFlowDiagram,
  textToImage,
  trackExpense
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    generateBusinessReport,
    extractIdData,
    convertDocument,
    pdfToJson,
    imageToJson,
    trackExpense,
    generateSocialMediaContent,
    textToFlowDiagram,
    textToImage,
    deepResearch,
    aiSearch,
    callModule,
    listModules
  ],
  triggers: []
});
