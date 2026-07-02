import { Slate } from 'slates';
import { spec } from './spec';
import {
  captureScreenshot,
  checkBalance,
  checkStatus,
  convertDocument,
  convertToMarkdown,
  createZip,
  deleteFile,
  extractPdfData,
  extractPdfPages,
  generateBarcode,
  generatePdf,
  generateThumbnail,
  mergePdfs,
  protectPdf,
  watermarkPdf
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    generatePdf,
    captureScreenshot,
    convertDocument,
    mergePdfs,
    extractPdfPages,
    protectPdf,
    watermarkPdf,
    generateBarcode,
    generateThumbnail,
    extractPdfData,
    createZip,
    convertToMarkdown,
    deleteFile,
    checkBalance,
    checkStatus
  ],
  triggers: [inboundWebhook]
});
