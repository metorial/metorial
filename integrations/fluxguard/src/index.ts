import { Slate } from 'slates';
import { spec } from './spec';
import {
  addPage,
  createCategory,
  createWebhook,
  deletePage,
  deleteSite,
  deleteWebhook,
  getAccount,
  getPage,
  getWebhookSample,
  listCategories,
  listWebhooks,
  startCrawl
} from './tools';
import { pageChangeTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    addPage,
    getPage,
    deletePage,
    deleteSite,
    startCrawl,
    listCategories,
    createCategory,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    getWebhookSample,
    getAccount
  ],
  triggers: [pageChangeTrigger]
});
