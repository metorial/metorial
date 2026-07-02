import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseReceivedEmails,
  createProxyEmail,
  createWebhookReceiver,
  getReceivedEmail,
  listProxyEmails,
  pollWebhookReceiver,
  updateProxyEmail
} from './tools';
import { incomingEmail } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createProxyEmail,
    listProxyEmails,
    updateProxyEmail,
    browseReceivedEmails,
    getReceivedEmail,
    createWebhookReceiver,
    pollWebhookReceiver
  ],
  triggers: [incomingEmail]
});
