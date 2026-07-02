import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDocument,
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
import { collectionEvents, commentEvents, documentEvents, userEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [documentEvents, collectionEvents, commentEvents, userEvents]
});
