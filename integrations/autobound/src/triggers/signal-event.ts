import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AutoboundClient } from '../lib/client';
import { spec } from '../spec';

let signalInputSchema = z.object({
  signalId: z.string().describe('Unique signal event identifier'),
  signalType: z
    .string()
    .describe('Signal category (e.g., "news", "workMilestone", "earnings-transcript")'),
  signalSubtype: z
    .string()
    .optional()
    .describe('Specific signal subtype (e.g., "jobChange", "funding")'),
  companyDomain: z.string().optional().describe('Associated company domain'),
  companyName: z.string().optional().describe('Associated company name'),
  contactEmail: z.string().optional().describe('Associated contact email'),
  contactName: z.string().optional().describe('Associated contact name'),
  detectedAt: z.string().optional().describe('When the signal was detected'),
  variables: z
    .record(z.string(), z.any())
    .optional()
    .describe('Signal-specific structured data'),
  raw: z.record(z.string(), z.any()).optional().describe('Full raw signal payload')
});

let signalOutputSchema = z.object({
  signalId: z.string().describe('Unique signal event identifier'),
  signalType: z.string().describe('Signal category'),
  signalSubtype: z.string().optional().describe('Signal subtype'),
  companyDomain: z.string().optional().describe('Associated company domain'),
  companyName: z.string().optional().describe('Associated company name'),
  contactEmail: z.string().optional().describe('Associated contact email'),
  contactName: z.string().optional().describe('Associated contact name'),
  detectedAt: z.string().optional().describe('When the signal was detected'),
  variables: z
    .record(z.string(), z.any())
    .optional()
    .describe('Signal-specific structured data')
});

export let signalEvent = SlateTrigger.create(spec, {
  name: 'Signal Event',
  key: 'signal_event',
  description:
    'Triggers when Autobound detects new signals (buying signals) matching your subscription criteria. Covers 25+ signal types including job changes, funding, news, SEC filings, hiring trends, tech stack changes, earnings transcripts, and more.'
})
  .input(signalInputSchema)
  .output(signalOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AutoboundClient(ctx.auth.token);

      let result = await client.createWebhookSubscription({
        endpointUrl: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          subscriptionId: result.subscriptionId,
          signingSecret: result.signingSecret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AutoboundClient(ctx.auth.token);

      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Handle both single signal and array of signals
      let signals = Array.isArray(body) ? body : [body];

      let inputs = signals.map((signal: any) => ({
        signalId: signal.signal_id ?? signal.signalId ?? signal.id ?? crypto.randomUUID(),
        signalType: signal.signal_type ?? signal.signalType ?? signal.type ?? 'unknown',
        signalSubtype: signal.signal_subtype ?? signal.signalSubtype ?? signal.subtype,
        companyDomain: signal.company_domain ?? signal.companyDomain ?? signal.domain,
        companyName: signal.company_name ?? signal.companyName,
        contactEmail: signal.contact_email ?? signal.contactEmail,
        contactName: signal.contact_name ?? signal.contactName,
        detectedAt: signal.detected_at ?? signal.detectedAt ?? signal.timestamp,
        variables: signal.variables ?? signal.data,
        raw: signal
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let signalType = ctx.input.signalType;
      let subtype = ctx.input.signalSubtype;
      let eventType = subtype ? `signal.${signalType}.${subtype}` : `signal.${signalType}`;

      return {
        type: eventType,
        id: ctx.input.signalId,
        output: {
          signalId: ctx.input.signalId,
          signalType: ctx.input.signalType,
          signalSubtype: ctx.input.signalSubtype,
          companyDomain: ctx.input.companyDomain,
          companyName: ctx.input.companyName,
          contactEmail: ctx.input.contactEmail,
          contactName: ctx.input.contactName,
          detectedAt: ctx.input.detectedAt,
          variables: ctx.input.variables
        }
      };
    }
  })
  .build();
