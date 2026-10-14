import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDocument,
  createResponse,
  deleteDocument,
  downloadDocumentSource,
  getDocument,
  getEntities,
  listDocumentChunks,
  listDocuments,
  listPartitions,
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
    downloadDocumentSource,
    listDocumentChunks,
    listPartitions,
    retrieveDocuments,
    createResponse,
    manageInstructions,
    getEntities,
    manageConnections,
    managePartitions
  ],
  triggers: []
});
