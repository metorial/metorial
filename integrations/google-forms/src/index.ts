import { Slate } from 'slates';
import { spec } from './spec';
import {
  createForm,
  getForm,
  getResponse,
  listResponses,
  manageWatches,
  setPublishSettings,
  updateForm
} from './tools';
import { formUpdated, inboundWebhook, newResponse } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createForm,
    getForm,
    updateForm,
    setPublishSettings,
    getResponse,
    listResponses,
    manageWatches
  ],
  triggers: [inboundWebhook, newResponse, formUpdated]
});
