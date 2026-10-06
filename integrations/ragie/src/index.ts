import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDocument,
  createResponse,
  deleteDocument,
  getDocument,
  getEntities,
  listDocuments,
  manageConnections,
  manageInstructions,
  managePartitions,
  retrieveDocuments,
  updateDocument
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createDocument,
    listDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    retrieveDocuments,
    createResponse,
    manageInstructions,
    getEntities,
    manageConnections,
    managePartitions
  ],
  triggers: []
});
