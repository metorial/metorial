import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCollection,
  createNote,
  deleteCollection,
  deleteNote,
  getCollection,
  getNote,
  listCollections,
  listNotes,
  manageCollectionMembership,
  memIt,
  searchCollections,
  searchNotes,
  updateCollection,
  updateNote
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    createNote,
    getNote,
    listNotes,
    searchNotes,
    deleteNote,
    createCollection,
    getCollection,
    listCollections,
    searchCollections,
    deleteCollection,
    memIt,
    updateNote,
    updateCollection,
    manageCollectionMembership
  ],
  triggers: []
});
