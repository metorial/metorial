import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let companyEvents = SlateTrigger.create(spec, {
  name: 'Company Events',
  key: 'company_events',
  description: 'Triggers when companies are created or updated in Salesmate.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of company event'),
      companyId: z.string().describe('ID of the company'),
      company: z.record(z.string(), z.unknown()).describe('Company record data')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the company'),
      name: z.string().optional().describe('Company name'),
      website: z.string().optional().describe('Company website'),
      phone: z.string().optional().describe('Phone number'),
      owner: z.unknown().optional().describe('Owner of the company'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      rawRecord: z.record(z.string(), z.unknown()).describe('Full company record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = createClient(ctx);
      let lastPolledAt = (ctx.state as Record<string, unknown>)?.lastPolledAt as
        | string
        | undefined;
      let now = new Date().toISOString();

      let fields = ['name', 'website', 'phone', 'owner', 'createdAt', 'modifiedAt'];

      let filters = lastPolledAt
        ? [
            {
              moduleName: 'Company',
              field: { fieldName: 'modifiedAt' },
              condition: 'GREATER_THAN',
              data: lastPolledAt
            }
          ]
        : [];

      let query =
        filters.length > 0
          ? {
              group: {
                operator: 'AND' as const,
                rules: filters
              }
            }
          : undefined;

      let result = await client.searchCompanies({
        fields,
        query,
        sortBy: 'modifiedAt',
        sortOrder: 'desc',
        pageNo: 1,
        rows: 100
      });

      let records = result?.Data?.data ?? [];

      let inputs = records.map((record: Record<string, unknown>) => {
        let recordId = String(record.id ?? '');
        let createdAt = record.createdAt as string | undefined;
        let modifiedAt = record.modifiedAt as string | undefined;
        let isNew = !lastPolledAt || (createdAt && modifiedAt && createdAt === modifiedAt);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          companyId: recordId,
          company: record
        };
      });

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },
    handleEvent: async ctx => {
      let record = ctx.input.company;
      return {
        type: `company.${ctx.input.eventType}`,
        id: `company-${ctx.input.companyId}-${Date.now()}`,
        output: {
          companyId: ctx.input.companyId,
          name: record.name as string | undefined,
          website: record.website as string | undefined,
          phone: record.phone as string | undefined,
          owner: record.owner,
          createdAt: record.createdAt as string | undefined,
          modifiedAt: record.modifiedAt as string | undefined,
          rawRecord: record
        }
      };
    }
  })
  .build();
