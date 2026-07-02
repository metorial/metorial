import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let prospectInputSchema = z.object({
  leadId: z.string().describe('ID of the lead'),
  email: z.string().optional().nullable().describe('Email address'),
  firstName: z.string().optional().nullable().describe('First name'),
  lastName: z.string().optional().nullable().describe('Last name'),
  companyName: z.string().optional().nullable().describe('Company name'),
  title: z.string().optional().nullable().describe('Job title'),
  status: z.string().optional().nullable().describe('Current status'),
  bounced: z.boolean().optional().nullable().describe('Whether bounced'),
  optedOut: z.boolean().optional().nullable().describe('Whether opted out'),
  sentCount: z.number().optional().nullable().describe('Number of emails sent'),
  repliedCount: z.number().optional().nullable().describe('Number of replies'),
  lastSentAt: z.string().optional().nullable().describe('Last sent timestamp'),
  ownerId: z.string().optional().nullable().describe('Owner user ID'),
  isNew: z.boolean().describe('Whether this is a newly discovered prospect')
});

let prospectOutputSchema = z.object({
  leadId: z.string().describe('Unique identifier for the lead'),
  email: z.string().optional().nullable().describe('Email address'),
  firstName: z.string().optional().nullable().describe('First name'),
  lastName: z.string().optional().nullable().describe('Last name'),
  companyName: z.string().optional().nullable().describe('Company name'),
  title: z.string().optional().nullable().describe('Job title'),
  status: z.string().optional().nullable().describe('Current status'),
  bounced: z.boolean().optional().nullable().describe('Whether emails have bounced'),
  optedOut: z.boolean().optional().nullable().describe('Whether the lead has opted out'),
  sentCount: z.number().optional().nullable().describe('Number of emails sent'),
  repliedCount: z.number().optional().nullable().describe('Number of replies'),
  lastSentAt: z.string().optional().nullable().describe('Last sent timestamp'),
  ownerId: z.string().optional().nullable().describe('Owner user ID')
});

export let prospectChanges = SlateTrigger.create(spec, {
  name: 'Prospect Changes',
  key: 'prospect_changes',
  description:
    'Triggers when a prospect (lead) is created or updated. Detects new prospects and changes to existing prospect data, status, or engagement metrics.'
})
  .input(prospectInputSchema)
  .output(prospectOutputSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let knownLeads: Record<string, string> =
        (ctx.state?.knownLeads as Record<string, string>) || {};
      let inputs: z.infer<typeof prospectInputSchema>[] = [];

      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let result = await client.listLeads({ page });
        let leads = result.leads || [];

        for (let lead of leads) {
          let leadId = lead.id;
          // Create a fingerprint to detect changes
          let fingerprint = JSON.stringify({
            status: lead.status,
            bounced: lead.bounced,
            optedout: lead.optedout,
            sent_count: lead.sent_count,
            replied_count: lead.replied_count,
            last_sent_at: lead.last_sent_at,
            data: lead.data
          });

          let isNew = !knownLeads[leadId];
          let isChanged = knownLeads[leadId] && knownLeads[leadId] !== fingerprint;

          if (isNew || isChanged) {
            inputs.push({
              leadId: lead.id,
              email: lead.data?.email,
              firstName: lead.data?.first_name,
              lastName: lead.data?.last_name,
              companyName: lead.data?.company_name,
              title: lead.data?.title,
              status: lead.status,
              bounced: lead.bounced,
              optedOut: lead.optedout,
              sentCount: lead.sent_count,
              repliedCount: lead.replied_count,
              lastSentAt: lead.last_sent_at,
              ownerId: lead.owner_id,
              isNew
            });
          }

          knownLeads[leadId] = fingerprint;
        }

        hasMore = !!result.next_page;
        page++;
      }

      return {
        inputs,
        updatedState: {
          knownLeads
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'prospect.created' : 'prospect.updated';

      return {
        type: eventType,
        id: `${ctx.input.leadId}-${eventType}-${Date.now()}`,
        output: {
          leadId: ctx.input.leadId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          companyName: ctx.input.companyName,
          title: ctx.input.title,
          status: ctx.input.status,
          bounced: ctx.input.bounced,
          optedOut: ctx.input.optedOut,
          sentCount: ctx.input.sentCount,
          repliedCount: ctx.input.repliedCount,
          lastSentAt: ctx.input.lastSentAt,
          ownerId: ctx.input.ownerId
        }
      };
    }
  })
  .build();
