import { Slate } from 'slates';
import { spec } from './spec';
import { getTemplate, listResults, listTemplates, renderImage, takeScreenshot } from './tools';
export let provider = Slate.create({
  spec,
  tools: [renderImage, takeScreenshot, listTemplates, getTemplate, listResults],
  triggers: []
});
