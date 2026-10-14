import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNote,
  createRelationship,
  getRelationship,
  getUser,
  listGroups,
  listRelationshipNotes,
  searchRelationships
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createRelationship,
    searchRelationships,
    addNote,
    getUser,
    listGroups,
    getRelationship,
    listRelationshipNotes
  ],
  triggers: []
});
