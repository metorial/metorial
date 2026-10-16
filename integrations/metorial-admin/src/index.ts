import { Slate } from 'slates';
import { spec } from './spec';
import {
  callEndpoint,
  getAccountContext,
  getInstance,
  listEndpoints,
  listInstances
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [listEndpoints, listInstances, callEndpoint, getAccountContext, getInstance],
  triggers: []
});
