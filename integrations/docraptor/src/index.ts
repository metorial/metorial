import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkAsyncStatus,
  createAsyncDocument,
  createDocument,
  createHostedDocument,
  expireHostedDocument,
  listDocuments,
  listIps
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    createDocument,
    createAsyncDocument,
    checkAsyncStatus,
    createHostedDocument,
    expireHostedDocument,
    listDocuments,
    listIps
  ],
  triggers: [inboundWebhook]
});
