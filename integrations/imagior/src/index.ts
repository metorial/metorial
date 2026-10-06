import { Slate } from 'slates';
import { spec } from './spec';
import { generateImage, getAccount, getTemplateElements, listTemplates } from './tools';
export let provider = Slate.create({
  spec,
  tools: [generateImage, listTemplates, getTemplateElements, getAccount],
  triggers: []
});
