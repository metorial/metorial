import { Slate } from 'slates';
import { spec } from './spec';
import { exportProjectionOpenApi, listApiProjections, queryProjectionRecords } from './tools';

export let provider = Slate.create({
  spec,
  tools: [listApiProjections, exportProjectionOpenApi, queryProjectionRecords],
  triggers: []
});
