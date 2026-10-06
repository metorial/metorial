import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDocument,
  exportDocument,
  getCurrentUser,
  getDocument,
  listCollections,
  listComments,
  listDocuments,
  listUsers,
  manageCollection,
  manageCollectionMembership,
  manageComment,
  manageDocument,
  manageGroup,
  searchDocuments,
  updateDocument
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    exportDocument,
    searchDocuments,
    getDocument,
    createDocument,
    updateDocument,
    manageDocument,
    listDocuments,
    listCollections,
    manageCollection,
    manageCollectionMembership,
    listUsers,
    listComments,
    manageComment,
    manageGroup
  ],
  triggers: []
});
