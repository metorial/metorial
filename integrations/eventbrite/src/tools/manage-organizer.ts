import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let organizerOutputSchema = z.object({
  organizerId: z.string().describe('The unique organizer ID.'),
  name: z.string().optional().describe('The organizer name.'),
  description: z.string().optional().describe('HTML description of the organizer.'),
  url: z.string().optional().describe("The organizer's Eventbrite URL."),
  website: z.string().optional().describe("The organizer's external website."),
  numPastEvents: z.number().optional().describe('Number of past events.'),
  numFutureEvents: z.number().optional().describe('Number of upcoming events.')
});

export let manageOrganizer = SlateTool.create(spec, {
  name: 'Manage Organizers',
  key: 'manage_organizer',
  description: `Get or create organizer profiles. Organizers are the public-facing entities associated with events. Use this to retrieve organizer details or create new organizer profiles within an organization.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create']).describe('The action to perform.'),
      organizerId: z.string().optional().describe('The organizer ID (required for get).'),
      organizationId: z
        .string()
        .optional()
        .describe(
          'The organization ID (required for create). Falls back to configured value.'
        ),
      name: z.string().optional().describe('Organizer name (required for create).'),
      description: z.string().optional().describe('HTML description of the organizer.'),
      website: z.string().optional().describe('External website URL.')
    })
  )
  .output(
    z.object({
      organizer: organizerOutputSchema.describe('The organizer profile.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapOrganizer = (o: any) => ({
      organizerId: o.id,
      name: o.name,
      description: o.description?.html,
      url: o.url,
      website: o.website,
      numPastEvents: o.num_past_events,
      numFutureEvents: o.num_future_events
    });

    if (ctx.input.action === 'get') {
      if (!ctx.input.organizerId) throw new Error('Organizer ID is required for get.');
      let organizer = await client.getOrganizer(ctx.input.organizerId);
      return {
        output: { organizer: mapOrganizer(organizer) },
        message: `Retrieved organizer **${organizer.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId) throw new Error('Organization ID is required for create.');
      if (!ctx.input.name) throw new Error('Organizer name is required.');

      let organizer = await client.createOrganizer(orgId, {
        name: ctx.input.name,
        description: ctx.input.description ? { html: ctx.input.description } : undefined,
        website: ctx.input.website
      });

      return {
        output: { organizer: mapOrganizer(organizer) },
        message: `Created organizer **${organizer.name}** with ID \`${organizer.id}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
