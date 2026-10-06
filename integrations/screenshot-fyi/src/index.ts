import { Slate } from 'slates';
import { spec } from './spec';
import { takeScreenshot } from './tools';

export let provider = Slate.create({
  spec,
  tools: [takeScreenshot],
  triggers: []
});
