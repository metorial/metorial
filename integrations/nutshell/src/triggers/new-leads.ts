import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let newLeads = SlateTrigger.create(spec, {
  name: 'New Leads',
  key: 'new_leads',
  description:
    '[Polling fallback] Polls for newly created leads in Nutshell CRM. Detects leads added since the last check.'
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      name: z.string().optional().describe('Lead name/description'),
      status: z.string().optional().describe('Lead status'),
      value: z.any().optional().describe('Lead value'),
      createdTime: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      name: z.string().optional().describe('Lead name/description'),
      status: z.string().optional().describe('Lead status'),
      value: z.any().optional().describe('Lead value'),
      contacts: z.array(z.any()).optional().describe('Associated contacts'),
      accounts: z.array(z.any()).optional().describe('Associated accounts'),
      assignee: z.any().optional().describe('Assigned user'),
      createdTime: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NutshellClient({
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let lastSeenId = (ctx.state as any)?.lastSeenId as number | undefined;

      let results = await client.findLeads({
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 50,
        page: 1
      });

      let newLeadsList = lastSeenId
        ? results.filter((l: any) => l.id > lastSeenId)
        : results.slice(0, 1);

      let highestId =
        results.length > 0 ? Math.max(...results.map((l: any) => l.id)) : lastSeenId;

      let inputs = newLeadsList.map((l: any) => ({
        leadId: l.id,
        name: l.name || l.description,
        status: l.status,
        value: l.value,
        createdTime: l.createdTime
      }));

      return {
        inputs,
        updatedState: {
          lastSeenId: highestId ?? lastSeenId
        }
      };
    },

    handleEvent: async ctx => {
      let client = new NutshellClient({
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let lead: any;
      try {
        lead = await client.getLead(ctx.input.leadId);
      } catch {
        lead = null;
      }

      return {
        type: 'lead.created',
        id: `lead-${ctx.input.leadId}`,
        output: {
          leadId: ctx.input.leadId,
          name: lead?.name || lead?.description || ctx.input.name,
          status: lead?.status || ctx.input.status,
          value: lead?.value || ctx.input.value,
          contacts: lead?.contacts,
          accounts: lead?.accounts,
          assignee: lead?.assignee,
          createdTime: lead?.createdTime || ctx.input.createdTime
        }
      };
    }
  })
  .build();
