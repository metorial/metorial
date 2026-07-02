import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let listActivityTypes = SlateTool.create(spec, {
  name: 'List Activity Types',
  key: 'list_activity_types',
  description: `List all available activity types in Nutshell CRM (e.g., Call, Meeting, Email). Use this to discover activity type IDs for creating activities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)')
    })
  )
  .output(
    z.object({
      activityTypes: z
        .array(
          z.object({
            activityTypeId: z.number().describe('ID of the activity type'),
            name: z.string().describe('Name of the activity type'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .describe('List of activity types'),
      count: z.number().describe('Number of activity types returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results = await client.findActivityTypes({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let activityTypes = results.map((t: any) => ({
      activityTypeId: t.id,
      name: t.name,
      entityType: t.entityType
    }));

    return {
      output: {
        activityTypes,
        count: activityTypes.length
      },
      message: `Found **${activityTypes.length}** activity type(s).`
    };
  })
  .build();
