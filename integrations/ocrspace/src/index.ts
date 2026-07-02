import { Slate } from 'slates';
import { spec } from './spec';
import { extractText, extractTextWithCoordinates, generateSearchablePdf } from './tools';

export let provider = Slate.create({
  spec,
  tools: [extractText, generateSearchablePdf, extractTextWithCoordinates],
  triggers: []
});
