import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRecipient,
  createDocument,
  getDocument,
  listDocuments,
  sendDocument
} from './tools';
import {
  documentCompleted,
  documentCreated,
  documentSigned,
  inboundWebhook
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [createDocument, addRecipient, sendDocument, getDocument, listDocuments],
  triggers: [inboundWebhook, documentCreated, documentSigned, documentCompleted]
});
