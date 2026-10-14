import { Slate } from 'slates';
import { spec } from './spec';
import {
  addTextToPdf,
  addWatermark,
  createEditorSession,
  createTemplate,
  deactivateEditorSession,
  deleteTemplate,
  fillPdfFields,
  generateImage,
  generatePdf,
  generatePdfAsync,
  getAccountInfo,
  getPdfInfo,
  getTemplate,
  listTemplates,
  listTemplateVersions,
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
    deactivateEditorSession,
    getAccountInfo,
    listTransactions,
    listTemplateVersions
  ],
  triggers: []
});
