import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { HelloLeadsClient } from '../lib/client';
import { spec } from '../spec';

export let newLeadAdded = SlateTrigger.create(spec, {
  name: 'New Lead Added',
  key: 'new_lead_added',
  description: 'Triggers when a new lead is created in HelloLeads CRM.'
})
  .input(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead'),
      firstName: z.string().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      mobile: z.string().optional().describe('Mobile phone number'),
      phone: z.string().optional().describe('Direct/office phone number'),
      organization: z.string().optional().describe('Company or organization name'),
      designation: z.string().optional().describe('Job title or designation'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      country: z.string().optional().describe('Country'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      website: z.string().optional().describe('Website URL'),
      potential: z.string().optional().describe('Lead potential rating'),
      dealSize: z.string().optional().describe('Estimated deal size'),
      tags: z.string().optional().describe('Tags associated with the lead'),
      notes: z.string().optional().describe('Notes about the lead'),
      createdAt: z.string().optional().describe('Timestamp when the lead was created')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead'),
      firstName: z.string().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      mobile: z.string().optional().describe('Mobile phone number'),
      phone: z.string().optional().describe('Direct/office phone number'),
      organization: z.string().optional().describe('Company or organization name'),
      designation: z.string().optional().describe('Job title or designation'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      country: z.string().optional().describe('Country'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      website: z.string().optional().describe('Website URL'),
      potential: z.string().optional().describe('Lead potential rating'),
      dealSize: z.string().optional().describe('Estimated deal size'),
      tags: z.string().optional().describe('Tags associated with the lead'),
      notes: z.string().optional().describe('Notes about the lead'),
      createdAt: z.string().optional().describe('Timestamp when the lead was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new HelloLeadsClient({
        token: ctx.auth.token,
        email: ctx.auth.email
      });

      let lastSeenId = (ctx.state as any)?.lastSeenId ?? 0;

      let result = await client.listLeads({ page: 1, limit: 100 });
      let rawLeads = Array.isArray(result) ? result : (result?.data ?? result?.leads ?? []);

      if (!Array.isArray(rawLeads)) {
        return { inputs: [], updatedState: { lastSeenId } };
      }

      let newLeads = rawLeads.filter((lead: any) => {
        let id = Number(lead.id ?? lead.lead_id ?? 0);
        return id > lastSeenId;
      });

      let highestId = lastSeenId;
      for (let lead of newLeads) {
        let id = Number(lead.id ?? lead.lead_id ?? 0);
        if (id > highestId) {
          highestId = id;
        }
      }

      let inputs = newLeads.map((lead: any) => ({
        leadId: String(lead.id ?? lead.lead_id ?? ''),
        firstName: String(lead.first_name ?? ''),
        lastName: lead.last_name || undefined,
        email: lead.email || undefined,
        mobile: lead.mobile || undefined,
        phone: lead.phone || undefined,
        organization: lead.organization ?? lead.company ?? undefined,
        designation: lead.designation || undefined,
        address: lead.address || undefined,
        city: lead.city || undefined,
        state: lead.state || undefined,
        country: lead.country || undefined,
        zip: lead.zip ?? lead.postal_code ?? undefined,
        website: lead.website || undefined,
        potential: lead.potential || undefined,
        dealSize: lead.deal_size ? String(lead.deal_size) : undefined,
        tags: lead.tags || undefined,
        notes: lead.notes || undefined,
        createdAt: lead.created_at ?? lead.createdAt ?? undefined
      }));

      return {
        inputs,
        updatedState: {
          lastSeenId: highestId
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
          mobile: ctx.input.mobile,
          phone: ctx.input.phone,
          organization: ctx.input.organization,
          designation: ctx.input.designation,
          address: ctx.input.address,
          city: ctx.input.city,
          state: ctx.input.state,
          country: ctx.input.country,
          zip: ctx.input.zip,
          website: ctx.input.website,
          potential: ctx.input.potential,
          dealSize: ctx.input.dealSize,
          tags: ctx.input.tags,
          notes: ctx.input.notes,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
