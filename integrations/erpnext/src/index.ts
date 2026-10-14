import { Slate } from 'slates';
import { spec } from './spec';
import {
  amendDocument,
  callMethod,
  cancelDocument,
  countDocuments,
  createDocument,
  deleteDocument,
  getCurrentUser,
  getDocument,
  getReport,
  listDocuments,
  submitDocument,
  updateDocument
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getDocument,
    listDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    submitDocument,
    cancelDocument,
    amendDocument,
    callMethod,
    getReport,
    countDocuments
  ],
  triggers: []
});
