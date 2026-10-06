import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSignatureRequest,
  getDocumentDetails,
  listDocuments,
  listTemplates
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [createSignatureRequest, listDocuments, listTemplates, getDocumentDetails],
  triggers: []
});
