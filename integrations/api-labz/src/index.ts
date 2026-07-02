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
  pdfToJson,
  textToFlowDiagram,
  textToImage,
  trackExpense
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

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
    callModule
  ],
  triggers: [inboundWebhook]
});
