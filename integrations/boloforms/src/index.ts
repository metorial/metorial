import { Slate } from 'slates';
import { spec } from './spec';
import {
  getFormResponses,
  getTemplateRespondents,
  listDocuments,
  sendTemplate
} from './tools';
import {
  documentSignatureTrigger,
  formResponseTrigger,
  templateResponseTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listDocuments, sendTemplate, getTemplateRespondents, getFormResponses],
  triggers: [documentSignatureTrigger, templateResponseTrigger, formResponseTrigger]
});
