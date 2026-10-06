import { Slate } from 'slates';
import { spec } from './spec';
import { enrichCompany, resolveIp } from './tools';
export let provider = Slate.create({
  spec,
  tools: [enrichCompany, resolveIp],
  triggers: []
});
