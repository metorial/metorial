import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let recordUpdated = SlateTrigger.create(spec, {
  name: 'Record Updated',
  key: 'record_updated',
  description:
    'Receive real-time notifications when previously enriched contact or company records are updated in ZoomInfo. Includes the list of changed attributes and the updated record data.'
})
  .input(
    z.object({
      objectType: z
        .enum(['contact', 'company'])
        .describe('Whether this is a contact or company update'),
      recordId: z.string().describe('ZoomInfo record ID that was updated'),
      changedAttributes: z
        .array(z.string())
        .optional()
        .describe('List of field names that changed'),
      record: z.record(z.string(), z.any()).describe('Updated record data')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ZoomInfo record ID that was updated'),
      objectType: z.string().describe('Object type: contact or company'),
      changedAttributes: z.array(z.string()).describe('List of attribute names that changed'),
      firstName: z.string().optional().describe('Contact first name (contacts only)'),
      lastName: z.string().optional().describe('Contact last name (contacts only)'),
      jobTitle: z.string().optional().describe('Contact job title (contacts only)'),
      companyName: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Email address (contacts only)'),
      fullRecord: z.record(z.string(), z.any()).describe('Full updated record data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.input.request.json();
      } catch {
        return { inputs: [] };
      }

      // ZoomInfo may send single or batched updates
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let objectType = event.objectType || event.type || 'contact';
        let record = event.data || event.record || event.payload || event;
        let recordId = String(record.id || record.personId || record.companyId || '');
        let changedAttributes = event.changedAttributes || event.changed_attributes || [];

        return {
          objectType:
            objectType.toLowerCase() === 'company'
              ? ('company' as const)
              : ('contact' as const),
          recordId,
          changedAttributes,
          record
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let record = ctx.input.record;
      let objectType = ctx.input.objectType;

      return {
        type: `${objectType}.updated`,
        id: ctx.input.recordId,
        output: {
          recordId: ctx.input.recordId,
          objectType,
          changedAttributes: ctx.input.changedAttributes || [],
          firstName: record.firstName as string | undefined,
          lastName: record.lastName as string | undefined,
          jobTitle: record.jobTitle as string | undefined,
          companyName: (record.companyName || record.name) as string | undefined,
          email: (record.email || record.emailAddress) as string | undefined,
          fullRecord: record
        }
      };
    }
  })
  .build();
