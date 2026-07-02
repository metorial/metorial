import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { calendlyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listEventTypes = SlateTool.create(spec, {
  name: 'List Event Types',
  key: 'list_event_types',
  description: `List event type templates (e.g., "30-min Demo", "Onboarding Call") for a user or organization. Event types define the meeting configurations including duration, location, and custom questions.`,
  instructions: [
    'Provide either userUri or organizationUri to scope the results.',
    'Use the event type URI in other tools like checking availability or creating scheduling links.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userUri: z.string().optional().describe('User URI to list event types for'),
      organizationUri: z
        .string()
        .optional()
        .describe('Organization URI to list event types across all members'),
      active: z.boolean().optional().describe('Filter by active status'),
      sort: z.string().optional().describe('Sort order, e.g. "name:asc" or "name:desc"'),
      count: z.number().optional().describe('Number of results per page (max 100)'),
      pageToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results')
    })
  )
  .output(
    z.object({
      eventTypes: z.array(
        z.object({
          eventTypeUri: z.string().describe('Unique URI of the event type'),
          name: z.string().describe('Event type name'),
          active: z.boolean().describe('Whether the event type is currently active'),
          slug: z.string().describe('URL-friendly identifier'),
          schedulingUrl: z.string().describe('URL for invitees to schedule this event type'),
          duration: z.number().describe('Duration in minutes'),
          kind: z.string().describe('Kind of event type (solo, group, etc.)'),
          type: z.string().describe('Type classification'),
          color: z.string().describe('Display color'),
          descriptionPlain: z.string().nullable().describe('Plain text description'),
          secret: z.boolean().describe('Whether this is a secret event type'),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.userUri && !ctx.input.organizationUri) {
      throw calendlyServiceError(
        'Provide either userUri or organizationUri to list event types.'
      );
    }

    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEventTypes({
      userUri: ctx.input.userUri,
      organizationUri: ctx.input.organizationUri,
      active: ctx.input.active,
      sort: ctx.input.sort,
      count: ctx.input.count,
      pageToken: ctx.input.pageToken
    });

    let eventTypes = result.collection.map(et => ({
      eventTypeUri: et.uri,
      name: et.name,
      active: et.active,
      slug: et.slug,
      schedulingUrl: et.schedulingUrl,
      duration: et.duration,
      kind: et.kind,
      type: et.type,
      color: et.color,
      descriptionPlain: et.descriptionPlain,
      secret: et.secret,
      createdAt: et.createdAt,
      updatedAt: et.updatedAt
    }));

    return {
      output: {
        eventTypes,
        nextPageToken: result.pagination.nextPageToken
      },
      message: `Found **${eventTypes.length}** event types.${result.pagination.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
