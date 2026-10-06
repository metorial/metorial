import { Slate } from 'slates';
import { spec } from './spec';
import {
  extractColorsTool,
  extractTextContentTool,
  generateDocumentTool,
  generatePageTool,
  inspectLayersTool,
  parseDocumentTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    parseDocumentTool,
    inspectLayersTool,
    extractColorsTool,
    extractTextContentTool,
    generatePageTool,
    generateDocumentTool
  ],
  triggers: []
});
