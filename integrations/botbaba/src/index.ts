import { Slate } from 'slates';
import { spec } from './spec';
import { listBots, sendWhatsAppTemplate } from './tools';
import { botEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listBots, sendWhatsAppTemplate],
  triggers: [botEvent]
});
