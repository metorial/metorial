import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient, requireArray, requireRecord } from '../lib/client';
import { spec } from '../spec';

export let listDestinations = SlateTool.create(spec, {
  key: 'list_destinations',
  name: 'List Destinations',
  description:
    'Discover a page of configured cloud storage destination IDs and names for use with manage_collection destinationIds.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page starting at 1. Ten destinations per page.'),
      searchTerm: z.string().optional().describe('Search destination names.'),
      sortBy: z
        .enum(['type', 'name'])
        .optional()
        .describe('Sort by storage type or destination name.'),
      sortDirection: z.enum(['ascending', 'descending']).optional().describe('Sort direction.')
    })
  )
  .output(
    z.object({
      destinations: z
        .array(
          z.object({
            id: z.string(),
            name: z.string().optional(),
            type: z.string().optional()
          })
        )
        .describe('Configured destination identifiers, names, and storage types.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new CountdownClient(ctx.auth).listDestinations(ctx.input);
    let destinations = requireArray(result.destinations, 'destinations').map(value => {
      let destination = requireRecord(value, 'destination');
      if (typeof destination.id !== 'string')
        throw createApiServiceError('Countdown API returned a destination without an ID.');
      return { id: destination.id, name: destination.name, type: destination.type };
    });
    return {
      output: { destinations },
      message: `Found ${destinations.length} destinations on this page.`
    };
  })
  .build();
