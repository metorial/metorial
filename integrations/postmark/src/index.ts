import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBounces,
  getServer,
  getStatistics,
  manageMessageStreams,
  manageSuppressions,
  manageTemplates,
  manageWebhooks,
  searchMessages,
  sendEmail,
  sendTemplateEmail
} from './tools';
import { inboundEmail, outboundEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendEmail.build(),
    sendTemplateEmail.build(),
    searchMessages.build(),
    getBounces.build(),
    manageSuppressions.build(),
    getStatistics.build(),
    manageTemplates.build(),
    manageMessageStreams.build(),
    getServer.build(),
    manageWebhooks.build()
  ],
  triggers: [outboundEvents.build(), inboundEmail.build()]
});
