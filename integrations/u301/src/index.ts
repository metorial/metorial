import { Slate } from 'slates';
import { spec } from './spec';
import { deleteLink, generateQrCode, listDomains, shortenUrl } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [shortenUrl, deleteLink, listDomains, generateQrCode],
  triggers: [inboundWebhook]
});
