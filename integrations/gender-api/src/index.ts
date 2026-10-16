import { Slate } from 'slates';
import { spec } from './spec';
import { accountStatistics, countryOfOrigin, detectGender, detectGenderBatch } from './tools';

export let provider = Slate.create({
  spec,
  tools: [detectGender, countryOfOrigin, accountStatistics, detectGenderBatch],
  triggers: []
});
