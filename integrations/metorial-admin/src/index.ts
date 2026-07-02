import { Slate } from '@slates/provider';
import { spec } from './spec';
import { callEndpoint, listEndpoints, listInstances } from './tools';

export let provider = Slate.create({
  spec,
  tools: [listEndpoints, listInstances, callEndpoint],
  triggers: []
});
