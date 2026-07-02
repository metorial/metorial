import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let companyChanges = SlateTrigger.create(spec, {
  name: 'Company Changes',
  key: 'company_changes',
  description: 'Triggers when a company is created or updated in Pipeline CRM.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of change detected'),
      companyId: z.number().describe('ID of the affected company'),
      company: z.any().describe('Full company record from the API')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('Unique company ID'),
      name: z.string().describe('Company name'),
      address: z.string().nullable().optional().describe('Company address'),
      phone: z.string().nullable().optional().describe('Phone number'),
      website: z.string().nullable().optional().describe('Website URL'),
      industry: z.string().nullable().optional().describe('Industry classification'),
      userId: z.number().nullable().optional().describe('Owner user ID'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        appKey: ctx.auth.appKey
      });

      let lastPolledAt = (ctx.state as any)?.lastPolledAt as string | undefined;

      let result = await client.listCompanies({
        page: 1,
        perPage: 200,
        sort: 'updated_at'
      });

      let entries = result.entries ?? [];

      let newEntries = lastPolledAt
        ? entries.filter(
            (company: any) => company.updated_at && company.updated_at > lastPolledAt
          )
        : entries;

      let inputs = newEntries.map((company: any) => {
        let isNew = !lastPolledAt || (company.created_at && company.created_at > lastPolledAt);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          companyId: company.id,
          company
        };
      });

      let latestTimestamp =
        entries.length > 0
          ? entries.reduce(
              (max: string, c: any) => (c.updated_at > max ? c.updated_at : max),
              entries[0]!.updated_at
            )
          : lastPolledAt;

      return {
        inputs,
        updatedState: {
          lastPolledAt: latestTimestamp ?? lastPolledAt
        }
      };
    },

    handleEvent: async ctx => {
      let company = ctx.input.company;

      return {
        type: `company.${ctx.input.eventType}`,
        id: `company-${ctx.input.companyId}-${company.updated_at ?? Date.now()}`,
        output: {
          companyId: company.id,
          name: company.name,
          address: company.address ?? null,
          phone: company.phone ?? null,
          website: company.website ?? null,
          industry: company.industry ?? null,
          userId: company.user_id ?? company.owner_id ?? null,
          createdAt: company.created_at ?? null,
          updatedAt: company.updated_at ?? null
        }
      };
    }
  })
  .build();
