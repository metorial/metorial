import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBounces,
  getServer,
  getStatistics,
  manageDomains,
  manageInboundRules,
  manageMessageStreams,
  manageSenderSignatures,
  manageSuppressions,
  manageTemplates,
  manageWebhooks,
  searchMessages,
  sendBatchEmails,
  sendBatchTemplateEmails,
  sendEmail,
  sendTemplateEmail
} from './tools';
import { inboundEmail, outboundEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendEmail.build(),
    sendBatchEmails.build(),
    sendTemplateEmail.build(),
    sendBatchTemplateEmails.build(),
    searchMessages.build(),
    getBounces.build(),
    manageSuppressions.build(),
    getStatistics.build(),
    manageTemplates.build(),
    manageMessageStreams.build(),
    manageInboundRules.build(),
    manageDomains.build(),
    manageSenderSignatures.build(),
    getServer.build(),
    manageWebhooks.build()
  ],
  triggers: [outboundEvents.build(), inboundEmail.build()]
});
