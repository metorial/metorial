import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEmbeddedSigningUrl,
  createSenderView,
  deleteEnvelope,
  downloadDocument,
  getEnvelope,
  getEnvelopeAuditEvents,
  getEnvelopeRecipients,
  getTemplate,
  listEnvelopes,
  listTemplates,
  sendEnvelope,
  sendEnvelopeFromTemplate,
  voidEnvelope
} from './tools';
import { envelopeEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendEnvelope,
    getEnvelope,
    listEnvelopes,
    downloadDocument,
    getEnvelopeAuditEvents,
    listTemplates,
    getTemplate,
    sendEnvelopeFromTemplate,
    voidEnvelope,
    deleteEnvelope,
    createEmbeddedSigningUrl,
    createSenderView,
    getEnvelopeRecipients
  ],
  triggers: [envelopeEvents]
});
