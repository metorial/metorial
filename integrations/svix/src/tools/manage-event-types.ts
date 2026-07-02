import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { svixServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listEventTypes = SlateTool.create(spec, {
  name: 'List Event Types',
  key: 'list_event_types',
  description: `List registered event types in your Svix environment. Event types categorize webhook messages and allow consumers to subscribe to specific events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of event types to return'),
      iterator: z.string().optional().describe('Pagination cursor'),
      order: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort order for returned event types'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Whether to include archived event types'),
      withContent: z.boolean().optional().describe('Whether to include schema content')
    })
  )
  .output(
    z.object({
      eventTypes: z.array(
        z.object({
          name: z.string().describe('Event type name (e.g., "invoice.paid")'),
          description: z.string().describe('Description of the event type'),
          archived: z.boolean().describe('Whether the event type is archived'),
          deprecated: z.boolean().describe('Whether the event type is deprecated'),
          featureFlag: z.string().optional().describe('Feature flag controlling visibility'),
          featureFlags: z
            .array(z.string())
            .optional()
            .describe('Feature flags controlling visibility'),
          groupName: z.string().optional().describe('Event type group name'),
          schemas: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('JSON Schema for the event payload'),
          createdAt: z.string().describe('When the event type was created'),
          updatedAt: z.string().describe('When the event type was last updated')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more results'),
      iterator: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching event types...');
    let result = await client.listEventTypes({
      limit: ctx.input.limit,
      iterator: ctx.input.iterator,
      order: ctx.input.order,
      includeArchived: ctx.input.includeArchived,
      withContent: ctx.input.withContent
    });

    let eventTypes = result.data.map(et => ({
      name: et.name,
      description: et.description,
      archived: et.archived ?? false,
      deprecated: et.deprecated ?? false,
      featureFlag: et.featureFlag ?? undefined,
      featureFlags: et.featureFlags ?? undefined,
      groupName: et.groupName ?? undefined,
      schemas: et.schemas ?? undefined,
      createdAt: et.createdAt,
      updatedAt: et.updatedAt
    }));

    return {
      output: {
        eventTypes,
        hasMore: !result.done,
        iterator: result.iterator ?? undefined
      },
      message: `Found **${eventTypes.length}** event type(s).${eventTypes.length > 0 ? `\n${eventTypes.map(et => `- \`${et.name}\` — ${et.description}`).join('\n')}` : ''}`
    };
  })
  .build();

export let createEventType = SlateTool.create(spec, {
  name: 'Create Event Type',
  key: 'create_event_type',
  description: `Register a new event type in Svix. Event types are the primary way for webhook consumers to configure which events they receive. Optionally include a JSONSchema (Draft 7) to define the expected payload shape.`,
  instructions: [
    'Event type names must match the pattern [a-zA-Z0-9\\-_.]+. Use dot-separated naming like "group.event" (e.g., "invoice.paid").',
    'Schemas use JSONSchema Draft 7 format.'
  ]
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Event type name (e.g., "invoice.paid"). Must match [a-zA-Z0-9\\-_.]+'),
      description: z.string().describe('Human-readable description of the event type'),
      schemas: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSONSchema (Draft 7) defining the expected payload shape'),
      archived: z
        .boolean()
        .optional()
        .describe('Whether to create the event type as archived'),
      deprecated: z
        .boolean()
        .optional()
        .describe('Whether to mark the event type as deprecated'),
      featureFlag: z.string().optional().describe('Deprecated. Use featureFlags instead.'),
      featureFlags: z
        .array(z.string())
        .optional()
        .describe('Feature flags to control visibility of this event type'),
      groupName: z.string().optional().describe('Event type group name')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Event type name'),
      description: z.string().describe('Description'),
      archived: z.boolean().describe('Whether the event type is archived'),
      deprecated: z.boolean().describe('Whether the event type is deprecated'),
      featureFlags: z.array(z.string()).optional().describe('Feature flags'),
      groupName: z.string().optional().describe('Event type group name'),
      createdAt: z.string().describe('When the event type was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Creating event type...');
    let et = await client.createEventType({
      name: ctx.input.name,
      description: ctx.input.description,
      schemas: ctx.input.schemas,
      archived: ctx.input.archived,
      deprecated: ctx.input.deprecated,
      featureFlag: ctx.input.featureFlag,
      featureFlags: ctx.input.featureFlags,
      groupName: ctx.input.groupName
    });

    return {
      output: {
        name: et.name,
        description: et.description,
        archived: et.archived ?? false,
        deprecated: et.deprecated ?? false,
        featureFlags: et.featureFlags ?? undefined,
        groupName: et.groupName ?? undefined,
        createdAt: et.createdAt
      },
      message: `Created event type \`${et.name}\` — ${et.description}.`
    };
  })
  .build();

export let getEventType = SlateTool.create(spec, {
  name: 'Get Event Type',
  key: 'get_event_type',
  description: `Retrieve an event type by name, including schemas, feature flags, grouping, and lifecycle state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventTypeName: z
        .string()
        .describe('Name of the event type to retrieve (e.g., "invoice.paid")')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Event type name'),
      description: z.string().describe('Description'),
      archived: z.boolean().describe('Whether the event type is archived'),
      deprecated: z.boolean().describe('Whether the event type is deprecated'),
      featureFlag: z.string().optional().describe('Deprecated feature flag'),
      featureFlags: z.array(z.string()).optional().describe('Feature flags'),
      groupName: z.string().optional().describe('Event type group name'),
      schemas: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON Schema definitions by version'),
      createdAt: z.string().describe('When the event type was created'),
      updatedAt: z.string().describe('When the event type was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching event type...');
    let et = await client.getEventType(ctx.input.eventTypeName);

    return {
      output: {
        name: et.name,
        description: et.description,
        archived: et.archived ?? false,
        deprecated: et.deprecated ?? false,
        featureFlag: et.featureFlag ?? undefined,
        featureFlags: et.featureFlags ?? undefined,
        groupName: et.groupName ?? undefined,
        schemas: et.schemas ?? undefined,
        createdAt: et.createdAt,
        updatedAt: et.updatedAt
      },
      message: `Event type \`${et.name}\` — ${et.description}.`
    };
  })
  .build();

export let updateEventType = SlateTool.create(spec, {
  name: 'Update Event Type',
  key: 'update_event_type',
  description: `Update an event type's description, schemas, archive/deprecation state, feature flags, or group name.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventTypeName: z
        .string()
        .describe('Name of the event type to update (e.g., "invoice.paid")'),
      description: z.string().describe('Updated human-readable description'),
      schemas: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated JSON Schema definitions by version'),
      archived: z.boolean().optional().describe('Whether the event type is archived'),
      deprecated: z.boolean().optional().describe('Whether the event type is deprecated'),
      featureFlag: z.string().optional().describe('Deprecated. Use featureFlags instead.'),
      featureFlags: z.array(z.string()).optional().describe('Updated feature flags'),
      groupName: z.string().optional().describe('Updated event type group name')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Event type name'),
      description: z.string().describe('Description'),
      archived: z.boolean().describe('Whether the event type is archived'),
      deprecated: z.boolean().describe('Whether the event type is deprecated'),
      featureFlags: z.array(z.string()).optional().describe('Feature flags'),
      groupName: z.string().optional().describe('Event type group name'),
      updatedAt: z.string().describe('When the event type was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Updating event type...');
    let et = await client.updateEventType(ctx.input.eventTypeName, {
      description: ctx.input.description,
      schemas: ctx.input.schemas,
      archived: ctx.input.archived,
      deprecated: ctx.input.deprecated,
      featureFlag: ctx.input.featureFlag,
      featureFlags: ctx.input.featureFlags,
      groupName: ctx.input.groupName
    });

    return {
      output: {
        name: et.name,
        description: et.description,
        archived: et.archived ?? false,
        deprecated: et.deprecated ?? false,
        featureFlags: et.featureFlags ?? undefined,
        groupName: et.groupName ?? undefined,
        updatedAt: et.updatedAt
      },
      message: `Updated event type \`${et.name}\`.`
    };
  })
  .build();

export let importEventTypesFromOpenApi = SlateTool.create(spec, {
  name: 'Import Event Types From OpenAPI',
  key: 'import_event_types_from_openapi',
  description: `Create or update Svix event types from an OpenAPI document's webhooks section. Supports dry runs to preview changes without modifying event types.`,
  instructions: [
    'Provide exactly one of spec or specRaw.',
    'Use dryRun=true to preview the event types Svix would modify.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      spec: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Pre-parsed OpenAPI JSON document'),
      specRaw: z.string().optional().describe('OpenAPI YAML or JSON document as a string'),
      dryRun: z.boolean().optional().describe('Preview changes without modifying event types'),
      replaceAll: z
        .boolean()
        .optional()
        .describe('Archive existing event types that are not present in the spec')
    })
  )
  .output(
    z.object({
      modified: z.array(z.string()).describe('Event type names modified by the import'),
      toModify: z
        .array(z.unknown())
        .optional()
        .describe('Dry-run event type changes that would be applied')
    })
  )
  .handleInvocation(async ctx => {
    let hasSpec = ctx.input.spec !== undefined;
    let hasSpecRaw = ctx.input.specRaw !== undefined;
    if (hasSpec === hasSpecRaw) {
      throw svixServiceError('Provide exactly one of spec or specRaw.');
    }

    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Importing event types from OpenAPI...');
    let result = await client.importEventTypesFromOpenApi({
      spec: ctx.input.spec,
      specRaw: ctx.input.specRaw,
      dryRun: ctx.input.dryRun,
      replaceAll: ctx.input.replaceAll
    });

    let data = result.data as {
      modified?: string[];
      to_modify?: unknown[];
    };
    let modified = data.modified || [];

    return {
      output: {
        modified,
        toModify: data.to_modify
      },
      message: ctx.input.dryRun
        ? `OpenAPI import dry run found **${modified.length}** event type(s) to modify.`
        : `Imported OpenAPI event types; **${modified.length}** event type(s) modified.`
    };
  })
  .build();

export let deleteEventType = SlateTool.create(spec, {
  name: 'Delete Event Type',
  key: 'delete_event_type',
  description: `Archive (soft-delete) an event type. Archived event types are hidden from consumers but can still be referenced by existing messages.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      eventTypeName: z
        .string()
        .describe('Name of the event type to delete (e.g., "invoice.paid")')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the event type was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Deleting event type...');
    await client.deleteEventType(ctx.input.eventTypeName);

    return {
      output: { deleted: true },
      message: `Deleted event type \`${ctx.input.eventTypeName}\`.`
    };
  })
  .build();
