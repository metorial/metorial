import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { accountEmailSchema, datasetIdSchema, getLegacyDatasetId } from '../lib/schemas';
import { spec } from '../spec';

export let getLeadEvents = SlateTool.create(spec, {
  name: 'Get Lead Events',
  key: 'get_lead_events',
  description:
    'Retrieve the behavioral events in a LeadBoxer session. Call get_lead_details with includeSessions to find session IDs, and list_datasets to discover the dataset ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID from get_lead_details with includeSessions'),
      datasetId: datasetIdSchema,
      accountEmail: accountEmailSchema,
      limit: z
        .number()
        .optional()
        .describe('Maximum events to retrieve, from 1 to 100. Defaults to 100.'),
      segmentId: z
        .number()
        .optional()
        .describe('Optional segment ID to filter events using an existing LeadBoxer segment')
    })
  )
  .output(
    z.object({
      sessionId: z.string(),
      events: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Provider event records, including available identifiers, timestamps, and custom event properties'
        ),
      count: z.number(),
      metaData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Query metadata returned by LeadBoxer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.input.datasetId ?? getLegacyDatasetId(ctx.config),
      accountEmail: ctx.input.accountEmail ?? ctx.auth.accountEmail
    });
    let page = await client.getLeadEvents(
      ctx.input.sessionId,
      ctx.input.limit,
      ctx.input.segmentId
    );
    return {
      output: {
        sessionId: ctx.input.sessionId,
        events: page.data,
        count: page.data.length,
        metaData: page.metaData
      },
      message: `Retrieved **${page.data.length}** event(s) for session ${ctx.input.sessionId}.`
    };
  })
  .build();
