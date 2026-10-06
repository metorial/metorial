import { Slate } from 'slates';
import { spec } from './spec';
import {
  aiExtractDocumentData,
  aiRunPrompt,
  aiSpeechToText,
  aiTranslate,
  archiveManage,
  barcodeCreate,
  barcodeRead,
  convertDocument,
  emailProcess,
  excelOperations,
  imageMetadata,
  imageProcess,
  ocrDocument,
  pdfExtractData,
  pdfFillForm,
  pdfManipulate,
  pdfMergeSplit,
  populateExcelTemplate,
  populateWordTemplate,
  subscriptionStatus,
  utilitySecurity,
  utilityText,
  wordOperations
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    convertDocument,
    pdfMergeSplit,
    pdfManipulate,
    pdfExtractData,
    pdfFillForm,
    populateWordTemplate,
    populateExcelTemplate,
    ocrDocument,
    aiExtractDocumentData,
    aiTranslate,
    aiSpeechToText,
    aiRunPrompt,
    imageProcess,
    imageMetadata,
    barcodeCreate,
    barcodeRead,
    wordOperations,
    excelOperations,
    archiveManage,
    emailProcess,
    utilitySecurity,
    utilityText,
    subscriptionStatus
  ],
  triggers: []
});
