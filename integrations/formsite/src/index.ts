import { Slate } from 'slates';
import { spec } from './spec';
import {
  getFormItems,
  getFormResult,
  getFormResults,
  listForms,
  manageWebhooks
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [listForms, getFormItems, getFormResults, getFormResult, manageWebhooks],
  triggers: []
});
