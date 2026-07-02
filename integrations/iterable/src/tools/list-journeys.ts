import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let listJourneys = SlateTool.create(spec, {
  name: 'List Journeys',
  key: 'list_journeys',
  description: `List Iterable journeys (workflows) in the current project. Use this to inspect available automation workflows and archived workflow inventory.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Page size, up to 50'),
      sort: z.string().optional().describe('Sort field with optional direction prefix'),
      state: z
        .array(z.string())
        .optional()
        .describe('Filter by journey state. Use Archived to list archived journeys.')
    })
  )
  .output(
    z.object({
      journeys: z.array(z.record(z.string(), z.any())).describe('Iterable journeys'),
      journeyCount: z.number().describe('Number of journeys returned'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    let result = await client.getJourneys({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      sort: ctx.input.sort,
      state: ctx.input.state
    });
    let journeys = result.journeys || result.workflows || result.params?.journeys || [];

    return {
      output: {
        journeys,
        journeyCount: journeys.length,
        message: `Found ${journeys.length} journey(s).`
      },
      message: `Retrieved **${journeys.length}** Iterable journey(s).`
    };
  })
  .build();
