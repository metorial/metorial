import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let getTimeline = SlateTool.create(spec, {
  name: 'Get Timeline',
  key: 'get_timeline',
  description: `Retrieve the timeline of interactions and changes for a contact, account, or lead in Nutshell CRM. Shows the history of activities, notes, and modifications.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['Contacts', 'Accounts', 'Leads'])
        .describe('Type of entity to get the timeline for'),
      entityId: z.number().describe('ID of the entity'),
      limit: z
        .number()
        .optional()
        .describe('Number of timeline entries to return (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)')
    })
  )
  .output(
    z.object({
      timeline: z
        .array(z.any())
        .describe('Timeline entries showing history of interactions and changes'),
      count: z.number().describe('Number of timeline entries returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results = await client.findTimeline(
      { entityType: ctx.input.entityType, id: ctx.input.entityId },
      { limit: ctx.input.limit, page: ctx.input.page }
    );

    return {
      output: {
        timeline: results,
        count: results.length
      },
      message: `Retrieved **${results.length}** timeline entries for ${ctx.input.entityType} (ID: ${ctx.input.entityId}).`
    };
  })
  .build();
