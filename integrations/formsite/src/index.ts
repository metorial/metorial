import { Slate } from 'slates';
import { spec } from './spec';
import { getFormItems, getFormResults, listForms, manageWebhooks } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listForms, getFormItems, getFormResults, manageWebhooks],
  triggers: []
});
