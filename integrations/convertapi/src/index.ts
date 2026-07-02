import { Slate } from 'slates';
import { spec } from './spec';
import {
  compressPdf,
  convertFile,
  convertFileAsync,
  decryptPdf,
  deleteFile,
  extractText,
  getAccountInfo,
  getAsyncJobResult,
  listSupportedConversions,
  mergePdf,
  pdfToPdfa,
  protectPdf,
  splitPdf,
  uploadFile,
  watermarkPdf
} from './tools';
import { asyncConversionComplete } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    convertFile,
    convertFileAsync,
    getAsyncJobResult,
    mergePdf,
    splitPdf,
    compressPdf,
    protectPdf,
    decryptPdf,
    extractText,
    watermarkPdf,
    getAccountInfo,
    listSupportedConversions,
    uploadFile,
    deleteFile,
    pdfToPdfa
  ],
  triggers: [asyncConversionComplete]
});
