import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggers when contacts are created or updated in Salesmate.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of contact event'),
      contactId: z.string().describe('ID of the contact'),
      contact: z.record(z.string(), z.unknown()).describe('Contact record data')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email address'),
      company: z.string().optional().describe('Company name'),
      owner: z.unknown().optional().describe('Owner of the contact'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      rawRecord: z.record(z.string(), z.unknown()).describe('Full contact record')
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

      let fields = [
        'firstName',
        'lastName',
        'email',
        'company',
        'owner',
        'createdAt',
        'modifiedAt'
      ];

      let filters = lastPolledAt
        ? [
            {
              moduleName: 'Contact',
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

      let result = await client.searchContacts({
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
          contactId: recordId,
          contact: record
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
      let record = ctx.input.contact;
      return {
        type: `contact.${ctx.input.eventType}`,
        id: `contact-${ctx.input.contactId}-${Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          firstName: record.firstName as string | undefined,
          lastName: record.lastName as string | undefined,
          email: record.email as string | undefined,
          company: record.company as string | undefined,
          owner: record.owner,
          createdAt: record.createdAt as string | undefined,
          modifiedAt: record.modifiedAt as string | undefined,
          rawRecord: record
        }
      };
    }
  })
  .build();
