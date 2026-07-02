import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description: `List Webex spaces (rooms) the authenticated user belongs to. Filter by team, type (direct or group), and sort by ID, last activity, or creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Filter spaces by team ID'),
      type: z.enum(['direct', 'group']).optional().describe('Filter by space type'),
      sortBy: z
        .enum(['id', 'lastactivity', 'created'])
        .optional()
        .describe('Sort order for results'),
      max: z
        .number()
        .optional()
        .describe('Maximum number of spaces to return (default 100, max 1000)')
    })
  )
  .output(
    z.object({
      spaces: z
        .array(
          z.object({
            spaceId: z.string().describe('Unique ID of the space'),
            title: z.string().optional().describe('Title of the space'),
            type: z.string().optional().describe('Type (direct or group)'),
            isLocked: z.boolean().optional().describe('Whether the space is moderated'),
            teamId: z.string().optional().describe('Associated team ID'),
            lastActivity: z.string().optional().describe('Timestamp of last activity'),
            creatorId: z.string().optional().describe('Creator person ID'),
            created: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of spaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.listRooms({
      teamId: ctx.input.teamId,
      type: ctx.input.type,
      sortBy: ctx.input.sortBy,
      max: ctx.input.max
    });

    let items = result.items || [];
    let spaces = items.map((r: any) => ({
      spaceId: r.id,
      title: r.title,
      type: r.type,
      isLocked: r.isLocked,
      teamId: r.teamId,
      lastActivity: r.lastActivity,
      creatorId: r.creatorId,
      created: r.created
    }));

    return {
      output: { spaces },
      message: `Found **${spaces.length}** space(s).`
    };
  })
  .build();
