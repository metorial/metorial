import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkSsl,
  convertDocument,
  executeJavascript,
  executePython,
  generateImage,
  generatePdf,
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
