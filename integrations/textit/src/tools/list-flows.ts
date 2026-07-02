import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFlows = SlateTool.create(spec, {
  name: 'List Flows',
  key: 'list_flows',
  description: `Retrieve flows from your TextIt workspace. Flows are automated conversational workflows. Filter by UUID, type, archived status, or modification date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flowUuid: z.string().optional().describe('Filter by a specific flow UUID'),
      type: z.enum(['message', 'voice', 'survey']).optional().describe('Filter by flow type'),
      archived: z.boolean().optional().describe('Filter by archived status'),
      before: z
        .string()
        .optional()
        .describe('Return only flows modified before this date (ISO 8601)'),
      after: z
        .string()
        .optional()
        .describe('Return only flows modified after this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      flows: z.array(
        z.object({
          flowUuid: z.string(),
          name: z.string(),
          type: z.string(),
          archived: z.boolean(),
          expires: z.number().describe('Expiry time in minutes for inactive contacts'),
          runs: z.object({
            active: z.number(),
            completed: z.number(),
            interrupted: z.number(),
            expired: z.number()
          }),
          results: z.array(
            z.object({
              key: z.string(),
              name: z.string(),
              categories: z.array(z.string())
            })
          ),
          createdOn: z.string(),
          modifiedOn: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listFlows({
      uuid: ctx.input.flowUuid,
      type: ctx.input.type,
      archived: ctx.input.archived,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let flows = result.results.map(f => ({
      flowUuid: f.uuid,
      name: f.name,
      type: f.type,
      archived: f.archived,
      expires: f.expires,
      runs: f.runs,
      results: f.results.map(r => ({
        key: r.key,
        name: r.name,
        categories: r.categories
      })),
      createdOn: f.created_on,
      modifiedOn: f.modified_on
    }));

    return {
      output: {
        flows,
        hasMore: result.next !== null
      },
      message: `Found **${flows.length}** flow(s)${result.next ? ' (more results available)' : ''}.`
    };
  })
  .build();
