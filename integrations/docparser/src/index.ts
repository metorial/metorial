import { Slate } from 'slates';
import { spec } from './spec';
import {
  getDocumentStatus,
  getParsedData,
  importDocument,
  listModelLayouts,
  listParsers,
  reintegrateDocuments,
  reparseDocuments
} from './tools';
import { documentParsed, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listParsers,
    listModelLayouts,
    importDocument,
    getDocumentStatus,
    getParsedData,
    reparseDocuments,
    reintegrateDocuments
  ],
  triggers: [inboundWebhook, documentParsed]
});
