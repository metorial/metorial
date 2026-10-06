import { Slate } from 'slates';
import { spec } from './spec';
import { createLink, deleteLink, updateLink } from './tools';

export let provider = Slate.create({
  spec,
  tools: [createLink, updateLink, deleteLink],
  triggers: []
});
