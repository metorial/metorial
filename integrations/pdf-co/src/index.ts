import { Slate } from 'slates';
import { spec } from './spec';
import {
  classifyDocument,
  convertPdf,
  editPdf,
  generateBarcode,
  generatePdf,
  getPdfInfo,
  mergePdf,
  parseDocument,
  parseInvoice,
  pdfOcr,
  pdfSecurity,
  readBarcode,
  searchPdfText,
  splitPdf
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    convertPdf,
    generatePdf,
    mergePdf,
    splitPdf,
    editPdf,
    pdfSecurity,
    generateBarcode,
    readBarcode,
    parseInvoice,
    parseDocument,
    classifyDocument,
    getPdfInfo,
    searchPdfText,
    pdfOcr
  ],
  triggers: [inboundWebhook]
});
