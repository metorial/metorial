import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let manageTaxonomyTool = SlateTool.create(spec, {
  name: 'Manage Taxonomy',
  key: 'manage_taxonomy',
  description: `Manage your Amplitude tracking plan (taxonomy). Create, update, delete, and list event types, event properties, user properties, and event categories. Useful for programmatically maintaining a clean, well-documented tracking plan.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['event_type', 'event_property', 'user_property', 'event_category'])
        .describe('Type of taxonomy resource to manage.'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform.'),
      eventType: z
        .string()
        .optional()
        .describe(
          'Event type name. Required for event_type get/update/delete and all event_property actions.'
        ),
      eventProperty: z
        .string()
        .optional()
        .describe('Event property name. Required for event_property get/update/delete.'),
      userProperty: z
        .string()
        .optional()
        .describe('User property name. Required for user_property get/update/delete.'),
      categoryId: z
        .string()
        .optional()
        .describe('Category ID. Required for event_category delete.'),
      create: z
        .object({
          name: z.string().describe('Name of the resource to create.'),
          description: z.string().optional().describe('Description of the resource.'),
          category: z.string().optional().describe('Category for event types.'),
          type: z
            .string()
            .optional()
            .describe('Data type for properties (e.g., "string", "number", "boolean").'),
          regex: z
            .string()
            .optional()
            .describe('Regex validation pattern for property values.'),
          enumValues: z
            .string()
            .optional()
            .describe('Comma-separated list of allowed values.'),
          isArrayType: z
            .boolean()
            .optional()
            .describe('Whether the property is an array type.'),
          isRequired: z
            .boolean()
            .optional()
            .describe('Whether the event property is required.')
        })
        .optional()
        .describe('Parameters for "create" action.'),
      update: z
        .object({
          newName: z.string().optional().describe('New name for the resource.'),
          description: z.string().optional().describe('Updated description.'),
          category: z.string().optional().describe('Updated category for event types.'),
          type: z.string().optional().describe('Updated data type.'),
          regex: z.string().optional().describe('Updated regex pattern.'),
          enumValues: z.string().optional().describe('Updated comma-separated enum values.'),
          isArrayType: z.boolean().optional().describe('Updated array type flag.'),
          isRequired: z.boolean().optional().describe('Updated required flag.')
        })
        .optional()
        .describe('Parameters for "update" action.')
    })
  )
  .output(
    z.object({
      items: z
        .array(z.any())
        .optional()
        .describe('List of taxonomy items (for "list" action).'),
      item: z.any().optional().describe('Single taxonomy item (for "get" action).'),
      result: z.any().optional().describe('Operation result (for create/update/delete).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { resourceType, action } = ctx.input;

    // --- Event Types ---
    if (resourceType === 'event_type') {
      if (action === 'list') {
        let result = await client.getEventTypes();
        return {
          output: { items: result.data ?? result },
          message: 'Listed all event types.'
        };
      }
      if (action === 'get') {
        if (!ctx.input.eventType) throw new Error('eventType is required.');
        let result = await client.getEventType(ctx.input.eventType);
        return {
          output: { item: result.data ?? result },
          message: `Retrieved event type "${ctx.input.eventType}".`
        };
      }
      if (action === 'create') {
        if (!ctx.input.create) throw new Error('create parameters are required.');
        let result = await client.createEventType({
          eventType: ctx.input.create.name,
          category: ctx.input.create.category,
          description: ctx.input.create.description
        });
        return {
          output: { result: result.data ?? result },
          message: `Created event type "${ctx.input.create.name}".`
        };
      }
      if (action === 'update') {
        if (!ctx.input.eventType || !ctx.input.update)
          throw new Error('eventType and update parameters are required.');
        let result = await client.updateEventType(ctx.input.eventType, {
          newEventType: ctx.input.update.newName,
          category: ctx.input.update.category,
          description: ctx.input.update.description
        });
        return {
          output: { result: result.data ?? result },
          message: `Updated event type "${ctx.input.eventType}".`
        };
      }
      if (action === 'delete') {
        if (!ctx.input.eventType) throw new Error('eventType is required.');
        let result = await client.deleteEventType(ctx.input.eventType);
        return {
          output: { result: result.data ?? result },
          message: `Deleted event type "${ctx.input.eventType}".`
        };
      }
    }

    // --- Event Properties ---
    if (resourceType === 'event_property') {
      if (action === 'list') {
        if (!ctx.input.eventType)
          throw new Error('eventType is required to list event properties.');
        let result = await client.getEventProperties(ctx.input.eventType);
        return {
          output: { items: result.data ?? result },
          message: `Listed event properties for "${ctx.input.eventType}".`
        };
      }
      if (action === 'create') {
        if (!ctx.input.create || !ctx.input.eventType)
          throw new Error('create parameters and eventType are required.');
        let result = await client.createEventProperty({
          eventType: ctx.input.eventType,
          eventProperty: ctx.input.create.name,
          description: ctx.input.create.description,
          type: ctx.input.create.type,
          regex: ctx.input.create.regex,
          enumValues: ctx.input.create.enumValues,
          isArrayType: ctx.input.create.isArrayType,
          isRequired: ctx.input.create.isRequired
        });
        return {
          output: { result: result.data ?? result },
          message: `Created event property "${ctx.input.create.name}" on "${ctx.input.eventType}".`
        };
      }
      if (action === 'update') {
        if (!ctx.input.eventProperty || !ctx.input.eventType || !ctx.input.update)
          throw new Error('eventProperty, eventType, and update parameters are required.');
        let result = await client.updateEventProperty(
          ctx.input.eventProperty,
          ctx.input.eventType,
          {
            newEventPropertyValue: ctx.input.update.newName,
            description: ctx.input.update.description,
            type: ctx.input.update.type,
            regex: ctx.input.update.regex,
            enumValues: ctx.input.update.enumValues,
            isArrayType: ctx.input.update.isArrayType,
            isRequired: ctx.input.update.isRequired
          }
        );
        return {
          output: { result: result.data ?? result },
          message: `Updated event property "${ctx.input.eventProperty}".`
        };
      }
      if (action === 'delete') {
        if (!ctx.input.eventProperty || !ctx.input.eventType)
          throw new Error('eventProperty and eventType are required.');
        let result = await client.deleteEventProperty(
          ctx.input.eventProperty,
          ctx.input.eventType
        );
        return {
          output: { result: result.data ?? result },
          message: `Deleted event property "${ctx.input.eventProperty}".`
        };
      }
    }

    // --- User Properties ---
    if (resourceType === 'user_property') {
      if (action === 'list') {
        let result = await client.getUserProperties();
        return {
          output: { items: result.data ?? result },
          message: 'Listed all user properties.'
        };
      }
      if (action === 'create') {
        if (!ctx.input.create) throw new Error('create parameters are required.');
        let result = await client.createUserProperty({
          userProperty: ctx.input.create.name,
          description: ctx.input.create.description,
          type: ctx.input.create.type,
          regex: ctx.input.create.regex,
          enumValues: ctx.input.create.enumValues,
          isArrayType: ctx.input.create.isArrayType
        });
        return {
          output: { result: result.data ?? result },
          message: `Created user property "${ctx.input.create.name}".`
        };
      }
      if (action === 'update') {
        if (!ctx.input.userProperty || !ctx.input.update)
          throw new Error('userProperty and update parameters are required.');
        let result = await client.updateUserProperty(ctx.input.userProperty, {
          newUserPropertyValue: ctx.input.update.newName,
          description: ctx.input.update.description,
          type: ctx.input.update.type,
          regex: ctx.input.update.regex,
          enumValues: ctx.input.update.enumValues,
          isArrayType: ctx.input.update.isArrayType
        });
        return {
          output: { result: result.data ?? result },
          message: `Updated user property "${ctx.input.userProperty}".`
        };
      }
      if (action === 'delete') {
        if (!ctx.input.userProperty) throw new Error('userProperty is required.');
        let result = await client.deleteUserProperty(ctx.input.userProperty);
        return {
          output: { result: result.data ?? result },
          message: `Deleted user property "${ctx.input.userProperty}".`
        };
      }
    }

    // --- Event Categories ---
    if (resourceType === 'event_category') {
      if (action === 'list') {
        let result = await client.getEventCategories();
        return {
          output: { items: result.data ?? result },
          message: 'Listed all event categories.'
        };
      }
      if (action === 'create') {
        if (!ctx.input.create) throw new Error('create parameters are required.');
        let result = await client.createEventCategory({ name: ctx.input.create.name });
        return {
          output: { result: result.data ?? result },
          message: `Created event category "${ctx.input.create.name}".`
        };
      }
      if (action === 'delete') {
        if (!ctx.input.categoryId) throw new Error('categoryId is required.');
        let result = await client.deleteEventCategory(ctx.input.categoryId);
        return {
          output: { result: result.data ?? result },
          message: `Deleted event category "${ctx.input.categoryId}".`
        };
      }
    }

    throw new Error(`Unsupported action "${action}" for resource type "${resourceType}".`);
  })
  .build();
