import { Slate } from 'slates';
import { spec } from './spec';
import { generatePdf, getWorkspace, listTemplates } from './tools';

export let provider = Slate.create({
  spec,
  tools: [generatePdf, listTemplates, getWorkspace],
  triggers: []
});
