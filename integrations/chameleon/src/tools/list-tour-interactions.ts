import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let interactionSchema = z.object({
  interactionId: z.string().describe('Chameleon interaction ID'),
  tourId: z.string().optional().describe('Associated tour ID'),
  state: z
    .string()
    .optional()
    .describe('Interaction state: started, completed, exited, or displayed'),
  groupId: z.string().optional().describe('Parent experience ID'),
  groupKind: z
    .string()
    .optional()
    .describe('Experience type: link, api_js, launcher, experiment, or campaign'),
  deferCount: z.number().optional().describe('Number of times snoozed'),
  deferUntil: z.string().nullable().optional().describe('Snooze expiration timestamp'),
  goalAt: z.string().nullable().optional().describe('Goal completion timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  profile: z.record(z.string(), z.unknown()).optional().describe('Expanded user profile')
});

export let listTourInteractions = SlateTool.create(spec, {
  name: 'List Tour Interactions',
  key: 'list_tour_interactions',
  description: `Retrieve user interactions for a specific Chameleon tour.
Shows how users interacted with the tour, including started, completed, exited, and displayed states.
Optionally expand user profile and company data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tourId: z.string().describe('Chameleon tour ID to get interactions for'),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of interactions to return (1-500, default 50)'),
      before: z.string().optional().describe('Pagination cursor for older items'),
      after: z.string().optional().describe('Pagination cursor for newer items'),
      order: z.enum(['created_at', 'updated_at']).optional().describe('Sort order field'),
      expandProfile: z
        .enum(['all', 'min', 'skip'])
        .optional()
        .describe('Level of profile detail'),
      expandCompany: z
        .enum(['all', 'min', 'skip'])
        .optional()
        .describe('Level of company detail')
    })
  )
  .output(
    z.object({
      interactions: z.array(interactionSchema).describe('Array of tour interactions'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    let expand: { profile?: string; company?: string } | undefined;
    if (ctx.input.expandProfile || ctx.input.expandCompany) {
      expand = {};
      if (ctx.input.expandProfile) expand.profile = ctx.input.expandProfile;
      if (ctx.input.expandCompany) expand.company = ctx.input.expandCompany;
    }

    let result = await client.listTourInteractions(ctx.input.tourId, {
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after,
      order: ctx.input.order,
      expand
    });

    let interactions = (result.interactions || []).map((i: Record<string, unknown>) => ({
      interactionId: i.id as string,
      tourId: i.tour_id as string | undefined,
      state: i.state as string | undefined,
      groupId: i.group_id as string | undefined,
      groupKind: i.group_kind as string | undefined,
      deferCount: i.defer_count as number | undefined,
      deferUntil: i.defer_until as string | null | undefined,
      goalAt: i.goal_at as string | null | undefined,
      createdAt: i.created_at as string | undefined,
      updatedAt: i.updated_at as string | undefined,
      profile: i.profile as Record<string, unknown> | undefined
    }));

    return {
      output: { interactions, cursor: result.cursor },
      message: `Returned **${interactions.length}** interactions for tour.`
    };
  })
  .build();
