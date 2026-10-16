import { Slate } from 'slates';
import { spec } from './spec';
import { listCategories, listCoins, searchEvents, v2Tools } from './tools';

export let provider = Slate.create({
  spec,
  tools: [searchEvents, listCoins, listCategories, ...v2Tools],
  triggers: []
});
