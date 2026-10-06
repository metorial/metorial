import { Slate } from 'slates';
import { spec } from './spec';
import { addNote, createRelationship, getUser, searchRelationships } from './tools';
export let provider = Slate.create({
  spec,
  tools: [createRelationship, searchRelationships, addNote, getUser],
  triggers: []
});
