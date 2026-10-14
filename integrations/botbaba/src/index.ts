import { Slate } from 'slates';
import { spec } from './spec';
import { listBots, sendWhatsAppTemplate, sendWhatsAppTemplateRequest } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listBots, sendWhatsAppTemplate, sendWhatsAppTemplateRequest],
  triggers: []
});
