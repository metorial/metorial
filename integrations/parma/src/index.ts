import { Slate } from 'slates';
import { spec } from './spec';
import { addNote, createRelationship, getUser, searchRelationships } from './tools';
import { inboundWebhook, newRelationship } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [createRelationship, searchRelationships, addNote, getUser],
  triggers: [inboundWebhook, newRelationship]
});
