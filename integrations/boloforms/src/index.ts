import { Slate } from 'slates';
import { spec } from './spec';
import {
  getFormResponses,
  getTemplateRespondents,
  listDocuments,
  sendTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [listDocuments, sendTemplate, getTemplateRespondents, getFormResponses],
  triggers: []
});
