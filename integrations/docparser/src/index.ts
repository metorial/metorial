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
  triggers: []
});
