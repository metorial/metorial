import { Slate } from 'slates';
import { spec } from './spec';
import {
  extractColorsTool,
  extractSymbolsTool,
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
    extractSymbolsTool,
    generatePageTool,
    generateDocumentTool
  ],
  triggers: []
});
