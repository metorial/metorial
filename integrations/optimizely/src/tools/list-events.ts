import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExperimentationClient } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Experimentation Events',
  key: 'list_events',
  description:
    'List the custom, click, and pageview events in an Experimentation project to discover event IDs for experiment metrics. Call manage_project with action=list to discover project IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      projectId: z
        .number()
        .describe('Project ID. Call manage_project with action=list to discover projects.'),
      page: z.number().optional().describe('Page number, starting at 1'),
      perPage: z.number().optional().describe('Maximum events returned per page, up to 100')
    })
  )
  .output(
    z.object({
      events: z.array(z.any()).describe('Events with stable IDs, names, keys, and types')
    })
  )
  .handleInvocation(async ctx => {
    let events = await new ExperimentationClient(ctx.auth.token).listEvents(
      ctx.input.projectId,
      { page: ctx.input.page, per_page: ctx.input.perPage }
    );
    return { output: { events }, message: `Listed ${events.length} Experimentation events.` };
  })
  .build();
