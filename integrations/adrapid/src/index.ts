import { Slate } from 'slates';
import { spec } from './spec';
import { createBanner, getAccount, getBanner, getUserAccess, listBanners } from './tools';

export let provider = Slate.create({
  spec,
  tools: [createBanner, getBanner, getAccount, getUserAccess, listBanners],
  triggers: []
});
