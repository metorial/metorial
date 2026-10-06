import { Slate } from 'slates';
import { spec } from './spec';
import { createContact, listContacts, listTemplates, sendPostcard } from './tools';

export let provider = Slate.create({
  spec,
  tools: [sendPostcard, listTemplates, listContacts, createContact],
  triggers: []
});
