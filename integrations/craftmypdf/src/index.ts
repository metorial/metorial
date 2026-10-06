import { Slate } from 'slates';
import { spec } from './spec';
import {
  addTextToPdf,
  addWatermark,
  createEditorSession,
  createTemplate,
  deleteTemplate,
  fillPdfFields,
  generateImage,
  generatePdf,
  generatePdfAsync,
  getAccountInfo,
  getPdfInfo,
  getTemplate,
  listTemplates,
  listTransactions,
  mergePdfs,
  updateTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    generatePdf,
    generatePdfAsync,
    generateImage,
    mergePdfs,
    addWatermark,
    addTextToPdf,
    fillPdfFields,
    getPdfInfo,
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createEditorSession,
    getAccountInfo,
    listTransactions
  ],
  triggers: []
});
