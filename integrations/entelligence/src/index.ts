import { Slate } from 'slates';
import { spec } from './spec';
import { botQuery, chatQuery, checkPermission } from './tools';

export let provider = Slate.create({
  spec,
  tools: [chatQuery, checkPermission, botQuery],
  triggers: []
});
