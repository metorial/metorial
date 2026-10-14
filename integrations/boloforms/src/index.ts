import { Slate } from 'slates';
import { spec } from './spec';
import {
  getFormResponses,
  getTemplateRespondents,
  listDocuments,
  sendReminder,
  sendTemplate,
  voidDocument
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listDocuments,
    sendTemplate,
    getTemplateRespondents,
    getFormResponses,
    sendReminder,
    voidDocument
  ],
  triggers: []
});
