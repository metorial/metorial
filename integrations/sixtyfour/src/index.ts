import { Slate } from 'slates';
import { spec } from './spec';
import { atlasTools, checkBalance, enrichmentTools, searchTools } from './tools';

export const provider = Slate.create({
  spec,
  tools: [checkBalance, ...searchTools, ...enrichmentTools, ...atlasTools],
  triggers: []
});
