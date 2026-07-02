import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let leadCreated = SlateTrigger.create(spec, {
  name: 'Lead Created',
  key: 'lead_created',
  description:
    'Fires when a new lead is created. Can optionally be filtered to only trigger when a specific lead field is present and matches a given value.'
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the created lead'),
      raw: z.record(z.string(), z.any()).optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the new lead'),
      firstName: z.string().optional().describe('Lead first name'),
      lastName: z.string().optional().describe('Lead last name'),
      email: z.string().optional().describe('Lead email'),
      phoneNumber: z.string().optional().describe('Lead phone number'),
      company: z.string().optional().describe('Lead company'),
      category: z.string().optional().describe('Lead category'),
      source: z.string().optional().describe('Lead source'),
      status: z.string().optional().describe('Lead status'),
      result: z.string().optional().describe('Lead result'),
      stage: z.string().optional().describe('Lead stage'),
      tags: z.any().optional().describe('Lead tags'),
      leadOwnerId: z.string().optional().describe('Assigned lead owner ID'),
      teamId: z.string().optional().describe('Assigned team ID'),
      teamName: z.string().optional().describe('Assigned team name'),
      createdAt: z.string().optional().describe('When the lead was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      let result = await client.createWebhook({
        name: 'Slates - Lead Created',
        event: 'lead_created',
        targetUrl: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: String(result.id)
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            leadId: String(data.id ?? data.lead_id ?? ''),
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.raw ?? {};
      let team = raw.team ?? {};

      return {
        type: 'lead.created',
        id: ctx.input.leadId,
        output: {
          leadId: ctx.input.leadId,
          firstName: raw.fname,
          lastName: raw.lname,
          email: raw.email,
          phoneNumber: raw.phone_number,
          company: raw.company,
          category: raw.category,
          source: raw.source,
          status: raw.status,
          result: raw.result,
          stage: raw.stage,
          tags: raw.tags,
          leadOwnerId: raw.lead_owner_id ? String(raw.lead_owner_id) : undefined,
          teamId: team.id ? String(team.id) : undefined,
          teamName: team.name,
          createdAt: raw.created_at
        }
      };
    }
  })
  .build();
