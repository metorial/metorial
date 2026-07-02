import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = [
  'domain.created',
  'domain.dns-records-changed',
  'domain.certificate-add',
  'domain.certificate-add-failed',
  'domain.certificate-deleted',
  'domain.certificate-renew',
  'domain.certificate-renew-failed',
  'domain.renewal',
  'domain.renewal-failed',
  'domain.auto-renew-changed',
  'domain.transfer-in-started',
  'domain.transfer-in-completed',
  'domain.transfer-in-failed'
] as const;

export let domainEventsTrigger = SlateTrigger.create(spec, {
  name: 'Domain Events',
  key: 'domain_events',
  description:
    'Fires when account-level domain events occur: creation, DNS changes, certificate lifecycle, renewal, and transfer events.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of domain event'),
      webhookId: z.string().describe('Webhook delivery ID'),
      payload: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      domainName: z.string().describe('Domain name'),
      registrar: z.string().optional().nullable().describe('Domain registrar'),
      verified: z.boolean().optional().describe('Whether domain is verified'),
      expiresAt: z.number().optional().nullable().describe('Domain expiration timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        teamId: ctx.config.teamId
      });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...webhookEvents]
      });

      return {
        registrationDetails: {
          webhookId: result.id,
          secret: result.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        teamId: ctx.config.teamId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!data.type?.startsWith('domain.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.type,
            webhookId: data.id,
            payload: data.payload || data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;
      let domain = p.domain || p;

      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          domainName: typeof domain === 'string' ? domain : domain?.name || '',
          registrar: domain?.registrar || null,
          verified: domain?.verified,
          expiresAt: domain?.expiresAt || null
        }
      };
    }
  })
  .build();
