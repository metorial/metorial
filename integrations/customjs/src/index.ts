import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkSsl,
  convertDocument,
  executeJavascript,
  executePython,
  executeStoredFunction,
  extractWebData,
  generateImage,
  generatePdf,
  getAccountDetails,
  managePages,
  manipulatePdf,
  processData,
  scrapeWebsite
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    executeJavascript,
    executePython,
    executeStoredFunction,
    extractWebData,
    getAccountDetails,
    generatePdf,
    manipulatePdf,
    generateImage,
    scrapeWebsite,
    managePages,
    convertDocument,
    processData,
    checkSsl
  ],
  triggers: []
});
