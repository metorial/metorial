import { Slate } from 'slates';
import { spec } from './spec';
import {
  createFunction,
  deleteFunction,
  generateDownloadUrl,
  generateUploadUrl,
  getFunction,
  getOperation,
  listFunctions,
  listRuntimes,
  manageIamPolicy,
  updateFunction
} from './tools';
import { functionChanges, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listFunctions,
    getFunction,
    createFunction,
    updateFunction,
    deleteFunction,
    listRuntimes,
    generateUploadUrl,
    generateDownloadUrl,
    manageIamPolicy,
    getOperation
  ],
  triggers: [inboundWebhook, functionChanges]
});
