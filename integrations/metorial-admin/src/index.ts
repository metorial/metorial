import { Slate } from 'slates';
import { toolCategories } from './categories';
import { generatedTools } from './lib/contractTools';
import { spec } from './spec';
import {
  callEndpoint,
  filesUpload,
  getAccountContext,
  getInstance,
  listEndpoints,
  listInstances
} from './tools';

export let provider = Slate.create({
  spec,
  toolCategories,
  tools: [
    listEndpoints,
    listInstances,
    callEndpoint,
    getAccountContext,
    getInstance,
    filesUpload,
    ...generatedTools
  ],
  triggers: []
});
