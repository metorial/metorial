import { Slate } from 'slates';
import { spec } from './spec';
import { createBanner, getAccount, getBanner, getUserAccess } from './tools';

export let provider = Slate.create({
  spec,
  tools: [createBanner, getBanner, getAccount, getUserAccess],
  triggers: []
});
