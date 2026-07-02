import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRuns = SlateTool.create(spec, {
  name: 'List Flow Runs',
  key: 'list_runs',
  description: `Retrieve flow runs from your TextIt workspace. A run represents a single contact's path through a flow. Filter by flow, contact, response status, or modification date.`,
  constraints: ['Cannot filter by both flow and contact simultaneously.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flowUuid: z.string().optional().describe('Filter by flow UUID'),
      contactUuid: z.string().optional().describe('Filter by contact UUID'),
      responded: z.boolean().optional().describe('Filter by whether the contact responded'),
      before: z
        .string()
        .optional()
        .describe('Return only runs modified before this date (ISO 8601)'),
      after: z
        .string()
        .optional()
        .describe('Return only runs modified after this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      runs: z.array(
        z.object({
          runUuid: z.string(),
          flowUuid: z.string(),
          flowName: z.string(),
          contactUuid: z.string(),
          contactName: z.string(),
          contactUrn: z.string(),
          responded: z.boolean(),
          values: z.record(
            z.string(),
            z.object({
              value: z.string(),
              category: z.string(),
              name: z.string(),
              time: z.string()
            })
          ),
          createdOn: z.string(),
          modifiedOn: z.string(),
          exitedOn: z.string().nullable(),
          exitType: z.string().nullable()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listRuns({
      flow: ctx.input.flowUuid,
      contact: ctx.input.contactUuid,
      responded: ctx.input.responded,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let runs = result.results.map(r => ({
      runUuid: r.uuid,
      flowUuid: r.flow.uuid,
      flowName: r.flow.name,
      contactUuid: r.contact.uuid,
      contactName: r.contact.name,
      contactUrn: r.contact.urn,
      responded: r.responded,
      values: Object.fromEntries(
        Object.entries(r.values).map(([key, v]) => [
          key,
          {
            value: v.value,
            category: v.category,
            name: v.name,
            time: v.time
          }
        ])
      ),
      createdOn: r.created_on,
      modifiedOn: r.modified_on,
      exitedOn: r.exited_on,
      exitType: r.exit_type
    }));

    return {
      output: {
        runs,
        hasMore: result.next !== null
      },
      message: `Found **${runs.length}** run(s)${result.next ? ' (more results available)' : ''}.`
    };
  })
  .build();
