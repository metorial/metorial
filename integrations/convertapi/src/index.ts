import { Slate } from 'slates';
import { spec } from './spec';
import {
  compressPdf,
  convertFile,
  convertFileAsync,
  decryptPdf,
  deleteAsyncJob,
  deleteFile,
  downloadFile,
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
    deleteAsyncJob,
    downloadFile,
    pdfToPdfa
  ],
  triggers: []
});
