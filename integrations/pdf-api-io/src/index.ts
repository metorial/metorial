import { Slate } from 'slates';
import { spec } from './spec';
import { generatePdf, getTemplate, listTemplates, mergeTemplates } from './tools';
import { pdfCreated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listTemplates, getTemplate, generatePdf, mergeTemplates],
  triggers: [pdfCreated]
});
