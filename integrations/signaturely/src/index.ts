import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSignatureRequest,
  getDocumentDetails,
  listDocuments,
  listTemplates
} from './tools';
import { documentCompletedTrigger, documentSentTrigger, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [createSignatureRequest, listDocuments, listTemplates, getDocumentDetails],
  triggers: [inboundWebhook, documentSentTrigger, documentCompletedTrigger]
});
