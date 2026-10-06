import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRecipient,
  createDocument,
  getDocument,
  listDocuments,
  sendDocument
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [createDocument, addRecipient, sendDocument, getDocument, listDocuments],
  triggers: []
});
