import { Slate } from 'slates';
import { spec } from './spec';
import { captureScreenshot, checkQuota, extractContent } from './tools';

export let provider = Slate.create({
  spec,
  tools: [captureScreenshot, checkQuota, extractContent],
  triggers: []
});
