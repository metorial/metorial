import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let leadChanges = SlateTrigger.create(spec, {
  name: 'Lead Changes',
  key: 'lead_changes',
  description:
    'Triggers when leads are created or updated in Freshsales. Requires a view ID that includes the leads you want to monitor.'
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      jobTitle: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      leadScore: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional(),
      isNew: z.boolean().describe('Whether this lead is newly created since last poll')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      jobTitle: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      leadScore: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let viewId = ctx.state?.viewId;
      if (!viewId) {
        let filters = await client.getLeadFilters();
        let defaultFilter =
          filters.find((f: Record<string, any>) => f.is_default) || filters[0];
        if (!defaultFilter) {
          return { inputs: [], updatedState: ctx.state || {} };
        }
        viewId = defaultFilter.id;
      }

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let result = await client.listLeads(viewId, {
        sort: 'updated_at',
        sortType: 'desc',
        page: 1
      });

      let leads = result.leads || [];
      let newInputs: any[] = [];

      for (let lead of leads) {
        if (lastPolledAt && lead.updated_at && lead.updated_at <= lastPolledAt) {
          break;
        }
        let isNew = !lastPolledAt || (lead.created_at && lead.created_at > lastPolledAt);
        newInputs.push({
          leadId: lead.id,
          firstName: lead.first_name,
          lastName: lead.last_name,
          displayName: lead.display_name,
          email: lead.email,
          jobTitle: lead.job_title,
          city: lead.city,
          country: lead.country,
          leadScore: lead.lead_score,
          createdAt: lead.created_at,
          updatedAt: lead.updated_at,
          isNew
        });
      }

      let updatedLastPolledAt =
        leads.length > 0 && leads[0]?.updated_at ? leads[0].updated_at : lastPolledAt;

      return {
        inputs: newInputs,
        updatedState: {
          viewId,
          lastPolledAt: updatedLastPolledAt
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'lead.created' : 'lead.updated';
      return {
        type: eventType,
        id: `${ctx.input.leadId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          leadId: ctx.input.leadId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          displayName: ctx.input.displayName,
          email: ctx.input.email,
          jobTitle: ctx.input.jobTitle,
          city: ctx.input.city,
          country: ctx.input.country,
          leadScore: ctx.input.leadScore,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
