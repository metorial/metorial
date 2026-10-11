import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageEvents = SlateTool.create(spec, {
  name: 'Manage Events',
  key: 'manage_events',
  description: `Query and retrieve events on a Wix site.
Use **action** to specify the operation: \`list\` or \`get\`.
Events include details like title, description, location, scheduling, RSVP/ticketing info, and status.`,
  instructions: [
    'Events can be filtered by status: UPCOMING, STARTED, ENDED, CANCELED, DRAFT (drafts also need includeDrafts).',
    'Use fieldset to include extra event properties, for example DETAILS, TEXTS, REGISTRATION, or URLS.',
    'Filter and sort by fields such as title, slug, createdDate, or dateAndTimeSettings.startDate.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('Operation to perform'),
      eventId: z.string().optional().describe('Event ID (required for get)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter object for list action'),
      sort: z
        .array(
          z.object({
            fieldName: z.string(),
            order: z.enum(['ASC', 'DESC'])
          })
        )
        .optional()
        .describe('Sort specification for list action'),
      fieldset: z
        .array(z.string())
        .optional()
        .describe(
          'Extra field sets to include (DETAILS, TEXTS, REGISTRATION, URLS, FORM, DASHBOARD, FEED, ONLINE_CONFERENCING_SESSION, SEO_SETTINGS, AGENDA, CATEGORIES)'
        ),
      includeDrafts: z
        .boolean()
        .optional()
        .describe('Whether to include draft events (for list)'),
      limit: z.number().optional().describe('Max items to return (default 50, max 1000)'),
      offset: z.number().optional().describe('Number of items to skip')
    })
  )
  .output(
    z.object({
      event: z.any().optional().describe('Single event data'),
      events: z.array(z.any()).optional().describe('List of events'),
      totalResults: z.number().optional().describe('Total number of matching events')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'list': {
        // Wix Query Events returns no events unless paging.limit is greater than 0.
        let result = await client.queryEvents({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          limit: ctx.input.limit ?? 50,
          offset: ctx.input.offset,
          fields: ctx.input.fieldset,
          includeDrafts: ctx.input.includeDrafts
        });
        let events = result.events || [];
        return {
          output: { events, totalResults: result.pagingMetadata?.total },
          message: `Found **${events.length}** events`
        };
      }
      case 'get': {
        if (!ctx.input.eventId)
          throw createApiServiceError('eventId is required for get action');
        let result = await client.getEvent(ctx.input.eventId, ctx.input.fieldset);
        return {
          output: { event: result.event },
          message: `Retrieved event **${result.event?.title || ctx.input.eventId}**`
        };
      }
    }
  })
  .build();
