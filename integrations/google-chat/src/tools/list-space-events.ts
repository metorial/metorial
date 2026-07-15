import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatSpaceEventName,
  resolveGoogleChatSpaceName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

export type GoogleChatSpaceEvent = {
  name?: string;
  eventTime?: string;
  eventType?: string;
  [key: string]: unknown;
};

let googleChatSpaceEventOutputSchema = z.object({
  eventName: z.string().describe('Full Google Chat space event resource name'),
  eventTime: z.string().optional().describe('Timestamp when the event occurred'),
  eventType: z.string().optional().describe('Google Workspace Chat event type'),
  payload: z
    .record(z.string(), z.unknown())
    .describe('Latest resource payload carried by the event')
});

export let mapGoogleChatSpaceEvent = (event: GoogleChatSpaceEvent) => {
  let eventName = event.name?.trim();
  if (!eventName) {
    throw googleChatValidationError(
      'Google Chat returned a space event without its required resource name.'
    );
  }
  let { name: _name, eventTime, eventType, ...payload } = event;

  return {
    eventName,
    eventTime,
    eventType,
    payload
  };
};

export type ListSpaceEventsInput = {
  space?: string;
  eventId?: string;
  filter?: string;
  pageSize?: number;
  pageToken?: string;
};

export type ListSpaceEventsRequest =
  | {
      mode: 'get';
      path: string;
      eventName: string;
    }
  | {
      mode: 'list';
      path: string;
      params: Record<string, unknown>;
    };

let resolveSpaceEventsFilter = (filter: string | undefined) => {
  let resolved = filter?.trim();
  if (!resolved) {
    throw googleChatValidationError(
      'filter is required when listing space events and must include at least one eventTypes clause.'
    );
  }

  let eventTypes = Array.from(
    resolved.matchAll(/\beventTypes\s*:\s*"([^"]+)"/g),
    match => match[1]
  ).filter((eventType): eventType is string => eventType !== undefined);
  if (eventTypes.length === 0) {
    throw googleChatValidationError(
      'filter must include at least one eventTypes:"google.workspace.chat..." clause.'
    );
  }
  if (eventTypes.some(eventType => eventType.includes('.v1.batch'))) {
    throw googleChatValidationError(
      'filter must omit batch event types; Google includes related batch events automatically.'
    );
  }
  return resolved;
};

export let buildListSpaceEventsRequest = (
  input: ListSpaceEventsInput,
  defaultSpace?: string
): ListSpaceEventsRequest => {
  if (input.eventId !== undefined) {
    if (
      input.filter !== undefined ||
      input.pageSize !== undefined ||
      input.pageToken !== undefined
    ) {
      throw googleChatValidationError(
        'filter, pageSize, and pageToken must be omitted when eventId requests one event.'
      );
    }
    let eventName = resolveGoogleChatSpaceEventName(
      input.eventId,
      input.space ?? defaultSpace
    );
    if (input.space !== undefined) {
      let explicitSpace = resolveGoogleChatSpaceName(input.space);
      if (!eventName.startsWith(`${explicitSpace}/spaceEvents/`)) {
        throw googleChatValidationError(
          'eventId must belong to the explicitly supplied space.'
        );
      }
    }
    return {
      mode: 'get',
      path: eventName,
      eventName
    };
  }

  let filter = resolveSpaceEventsFilter(input.filter);
  let parent = resolveGoogleChatSpaceName(input.space, defaultSpace);
  return {
    mode: 'list',
    path: `${parent}/spaceEvents`,
    params: pickDefined({
      filter,
      pageSize: input.pageSize,
      pageToken: input.pageToken
    })
  };
};

export let listSpaceEvents = SlateTool.create(spec, {
  name: 'List Space Events',
  key: 'list_space_events',
  description:
    'List events from a Google Chat space, or provide eventId to retrieve one specific space event.',
  instructions: [
    'List filters must include at least one non-batch eventTypes clause. Google automatically includes corresponding batch events.',
    'The OAuth scope Google enforces depends on the eventTypes in filter: message events need a message read scope, reaction events a reaction scope, membership events a membership read scope, and space-update events a space read scope.',
    'Space events are available for up to 28 days.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.listSpaceEvents)
  .authMethods(googleChatActionAuthMethods.listSpaceEvents)
  .input(
    z.object({
      space: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Space ID or spaces/{space} resource name; defaults to defaultSpace'),
      eventId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Space event ID or full spaces/{space}/spaceEvents/{event} resource name to get one event'
        ),
      filter: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Required list filter with eventTypes and optional RFC 3339 startTime/endTime clauses'
        ),
      pageSize: z
        .number()
        .int()
        .positive()
        .max(1000)
        .optional()
        .describe('Maximum events to return when listing'),
      pageToken: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Pagination token from a previous list response')
    })
  )
  .output(
    z.object({
      mode: z
        .enum(['get', 'list'])
        .describe('Whether one event was retrieved or events listed'),
      event: googleChatSpaceEventOutputSchema
        .optional()
        .describe('Single event returned when eventId is provided'),
      events: z
        .array(googleChatSpaceEventOutputSchema)
        .optional()
        .describe('Events returned by a list request'),
      nextPageToken: z.string().optional().describe('Token for the next page of events')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildListSpaceEventsRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);

    if (request.mode === 'get') {
      let response = await client.request<GoogleChatSpaceEvent>(request.path, {
        method: 'get',
        operation: 'get space event'
      });
      let event = mapGoogleChatSpaceEvent(response);
      return {
        output: {
          mode: request.mode,
          event
        },
        message: `Retrieved space event \`${event.eventName}\`.`
      };
    }

    let response = await client.request<{
      spaceEvents?: GoogleChatSpaceEvent[];
      nextPageToken?: string;
    }>(request.path, {
      method: 'get',
      params: request.params,
      operation: 'list space events'
    });
    let events = (response.spaceEvents ?? []).map(mapGoogleChatSpaceEvent);
    return {
      output: {
        mode: request.mode,
        events,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${events.length}** space event(s).`
    };
  })
  .build();
