import { Slate } from 'slates';
import { spec } from './spec';
import { convertDocument, extractText, getAccountInfo } from './tools';

export let provider = Slate.create({
  spec,
  tools: [extractText, convertDocument, getAccountInfo],
  triggers: []
});
