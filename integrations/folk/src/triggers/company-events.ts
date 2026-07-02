import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let changeSchema = z.object({
  path: z.array(z.string()).describe('Attribute path that changed'),
  type: z.enum(['add', 'remove', 'set']).describe('Type of change'),
  value: z.unknown().optional().describe('New value')
});

export let companyEvents = SlateTrigger.create(spec, {
  name: 'Company Events',
  key: 'company_events',
  description:
    'Triggers when a company is created, updated, deleted, or their group membership changes in your Folk workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of company event'),
      eventId: z.string().describe('Unique event ID'),
      companyId: z.string().describe('ID of the affected company'),
      companyUrl: z.string().describe('API URL to fetch company details'),
      changes: z.array(changeSchema).optional().describe('Changes made (for update events)'),
      details: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional details (for delete events)'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the affected company'),
      companyUrl: z.string().describe('API URL for the company'),
      name: z.string().optional().describe('Company name (when available)'),
      industry: z.string().nullable().optional().describe('Company industry (when available)'),
      emails: z.array(z.string()).optional().describe('Company emails (when available)'),
      changes: z.array(changeSchema).optional().describe('Specific changes made'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        name: 'Slates - Company Events',
        targetUrl: ctx.input.webhookBaseUrl,
        subscribedEvents: [
          { eventType: 'company.created' },
          { eventType: 'company.updated' },
          { eventType: 'company.deleted' },
          { eventType: 'company.groups_updated' }
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          signingSecret: webhook.signingSecret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let data = body.data as Record<string, unknown> | undefined;
      let eventType = body.type as string;

      return {
        inputs: [
          {
            eventType,
            eventId: body.id as string,
            companyId: (data?.id as string) ?? '',
            companyUrl: (data?.url as string) ?? '',
            changes:
              (data?.changes as Array<{
                path: string[];
                type: 'add' | 'remove' | 'set';
                value?: unknown;
              }>) ?? undefined,
            details: (data?.details as Record<string, unknown>) ?? undefined,
            createdAt: body.createdAt as string
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: Record<string, unknown> = {
        companyId: ctx.input.companyId,
        companyUrl: ctx.input.companyUrl,
        createdAt: ctx.input.createdAt
      };

      if (ctx.input.changes) {
        output.changes = ctx.input.changes;
      }

      if (ctx.input.details) {
        let details = ctx.input.details;
        if (details.name) output.name = details.name;
        if (details.emails) output.emails = details.emails;
      }

      if (ctx.input.eventType !== 'company.deleted' && ctx.input.companyId) {
        try {
          let client = new Client({ token: ctx.auth.token });
          let company = await client.getCompany(ctx.input.companyId);
          output.name = company.name;
          output.industry = company.industry;
          output.emails = company.emails;
        } catch {
          // Company may not be fetchable
        }
      }

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: output as {
          companyId: string;
          companyUrl: string;
          createdAt: string;
          name?: string;
          industry?: string | null;
          emails?: string[];
          changes?: Array<{ path: string[]; type: 'add' | 'remove' | 'set'; value?: unknown }>;
        }
      };
    }
  })
  .build();
