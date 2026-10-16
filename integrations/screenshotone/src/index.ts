import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeWithVision,
  extractMetadata,
  generatePdf,
  getUsage,
  renderFile,
  takeScreenshot
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    takeScreenshot,
    generatePdf,
    extractMetadata,
    getUsage,
    analyzeWithVision,
    renderFile
  ],
  triggers: []
});
