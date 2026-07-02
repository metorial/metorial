import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newLeadTrigger = SlateTrigger.create(spec, {
  name: 'New Lead',
  key: 'new_lead',
  description:
    'Triggers when a new lead is created in AgencyZoom. Polls for recently created leads.'
})
  .input(
    z.object({
      leadId: z.string().describe('Unique ID of the lead'),
      firstName: z.string().optional().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      phone: z.string().optional().describe('Phone number of the lead'),
      status: z.string().optional().describe('Current status of the lead'),
      leadSource: z.string().optional().describe('Source of the lead'),
      producer: z.string().optional().describe('Assigned producer'),
      createdAt: z.string().optional().describe('ISO timestamp when the lead was created'),
      raw: z.any().optional().describe('Raw lead data from the API')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Unique ID of the lead'),
      firstName: z.string().optional().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      phone: z.string().optional().describe('Phone number of the lead'),
      status: z.string().optional().describe('Current status of the lead'),
      leadSource: z.string().optional().describe('Source of the lead'),
      producer: z.string().optional().describe('Assigned producer'),
      createdAt: z.string().optional().describe('ISO timestamp when the lead was created'),
      raw: z.any().optional().describe('Full lead data from the API')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiKey: ctx.auth.apiKey,
        apiSecret: ctx.auth.apiSecret
      });

      let lastPolledAt =
        ctx.state?.lastPolledAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      let result = await client.searchLeads({
        fromDate: lastPolledAt,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 100
      });

      let leads = Array.isArray(result)
        ? result
        : result?.data || result?.leads || result?.items || [];

      let inputs = leads.map((lead: any) => ({
        leadId: lead.id || lead.leadId || lead._id || String(lead),
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        leadSource: lead.leadSource?.name || lead.leadSourceName || lead.leadSource,
        producer: lead.agent?.name || lead.agentName || lead.producer,
        createdAt: lead.createdAt || lead.dateCreated || lead.created,
        raw: lead
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: new Date().toISOString()
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'lead.created',
        id: ctx.input.leadId,
        output: {
          leadId: ctx.input.leadId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          phone: ctx.input.phone,
          status: ctx.input.status,
          leadSource: ctx.input.leadSource,
          producer: ctx.input.producer,
          createdAt: ctx.input.createdAt,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
