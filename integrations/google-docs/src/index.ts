import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDocument,
  createDocumentMarkdown,
  editDocument,
  getDocument,
  listDocuments,
  manageNamedRanges,
  mergeTemplate,
  updateDocumentMarkdown
} from './tools';
import { documentChanged, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createDocument,
    createDocumentMarkdown,
    getDocument,
    editDocument,
    mergeTemplate,
    listDocuments,
    manageNamedRanges,
    updateDocumentMarkdown
  ],
  triggers: [inboundWebhook, documentChanged]
});
