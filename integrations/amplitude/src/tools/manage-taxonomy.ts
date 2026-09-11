import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { amplitudeServiceError } from '../lib/errors';
import { parseResponse, recordSchema } from '../lib/rest-validation';
import { spec } from '../spec';

export let manageTaxonomyTool = SlateTool.create(spec, {
  name: 'Manage Taxonomy',
  key: 'manage_taxonomy',
  description: `Manage your Amplitude tracking plan (taxonomy). Create, update, delete, and list event types, event properties, user properties, and event categories. Useful for programmatically maintaining a clean, well-documented tracking plan.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .authMethods(['api_key_secret'])
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
        .describe(
          'User property name. Prefix custom properties with gp:. Required for user_property get/update/delete.'
        ),
      categoryId: z
        .string()
        .optional()
        .describe(
          'Category ID from the category list. Required for event_category update/delete; an alternative to categoryName for get.'
        ),
      categoryName: z
        .string()
        .optional()
        .describe(
          'Event category name for get. Alternatively supply categoryId from the category list.'
        ),
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
        .array(z.unknown())
        .optional()
        .describe('List of taxonomy items (for "list" action).'),
      item: z.unknown().optional().describe('Single taxonomy item (for "get" action).'),
      result: z.unknown().optional().describe('Operation result (for create/update/delete).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createAmplitudeClient(ctx);

    let { resourceType, action } = ctx.input;
    let parameters =
      action === 'create'
        ? ctx.input.create
        : action === 'update'
          ? ctx.input.update
          : undefined;
    if (
      parameters?.type !== undefined &&
      !['string', 'number', 'boolean', 'enum', 'any'].includes(parameters.type)
    )
      throw amplitudeServiceError(
        'Property type must be string, number, boolean, enum, or any.'
      );
    if (
      parameters?.regex !== undefined &&
      parameters.type !== undefined &&
      parameters.type !== 'string'
    )
      throw amplitudeServiceError('regex is only supported for string properties.');
    if (
      parameters?.enumValues !== undefined &&
      parameters.type !== undefined &&
      parameters.type !== 'enum'
    )
      throw amplitudeServiceError('enumValues is only supported for enum properties.');
    if (action === 'update' && ctx.input.update && Object.keys(ctx.input.update).length === 0)
      throw amplitudeServiceError('Provide at least one update field.');

    // --- Event Types ---
    if (resourceType === 'event_type') {
      if (action === 'list') {
        let result = await client.getEventTypes();
        return {
          output: {
            items: parseResponse(z.array(recordSchema), result.data, 'taxonomy list')
          },
          message: 'Listed all event types.'
        };
      }
      if (action === 'get') {
        if (!ctx.input.eventType) throw amplitudeServiceError('eventType is required.');
        let result = await client.getEventType(ctx.input.eventType);
        return {
          output: { item: parseResponse(recordSchema, result.data, 'taxonomy lookup') },
          message: `Retrieved event type "${ctx.input.eventType}".`
        };
      }
      if (action === 'create') {
        if (!ctx.input.create) {
          throw amplitudeServiceError('create parameters are required.');
        }
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
          throw amplitudeServiceError('eventType and update parameters are required.');
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
        if (!ctx.input.eventType) throw amplitudeServiceError('eventType is required.');
        let result = await client.deleteEventType(ctx.input.eventType);
        return {
          output: { result: result.data ?? result },
          message: `Deleted event type "${ctx.input.eventType}".`
        };
      }
    }

    // --- Event Properties ---
    if (resourceType === 'event_property') {
      if (action === 'get') {
        if (!ctx.input.eventType || !ctx.input.eventProperty)
          throw amplitudeServiceError('eventType and eventProperty are required.');
        let result = await client.getEventProperty(
          ctx.input.eventProperty,
          ctx.input.eventType
        );
        return {
          output: { item: parseResponse(recordSchema, result.data, 'taxonomy lookup') },
          message: `Retrieved event property "${ctx.input.eventProperty}".`
        };
      }
      if (action === 'list') {
        if (!ctx.input.eventType)
          throw amplitudeServiceError('eventType is required to list event properties.');
        let result = await client.getEventProperties(ctx.input.eventType);
        return {
          output: {
            items: parseResponse(z.array(recordSchema), result.data, 'taxonomy list')
          },
          message: `Listed event properties for "${ctx.input.eventType}".`
        };
      }
      if (action === 'create') {
        if (!ctx.input.create || !ctx.input.eventType)
          throw amplitudeServiceError('create parameters and eventType are required.');
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
          throw amplitudeServiceError(
            'eventProperty, eventType, and update parameters are required.'
          );
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
          throw amplitudeServiceError('eventProperty and eventType are required.');
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
      if (action === 'get') {
        if (!ctx.input.userProperty) throw amplitudeServiceError('userProperty is required.');
        let result = await client.getUserProperty(ctx.input.userProperty);
        return {
          output: { item: parseResponse(recordSchema, result.data, 'taxonomy lookup') },
          message: `Retrieved user property "${ctx.input.userProperty}".`
        };
      }
      if (action === 'list') {
        let result = await client.getUserProperties();
        return {
          output: {
            items: parseResponse(z.array(recordSchema), result.data, 'taxonomy list')
          },
          message: 'Listed all user properties.'
        };
      }
      if (action === 'create') {
        if (!ctx.input.create) {
          throw amplitudeServiceError('create parameters are required.');
        }
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
          throw amplitudeServiceError('userProperty and update parameters are required.');
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
        if (!ctx.input.userProperty) {
          throw amplitudeServiceError('userProperty is required.');
        }
        let result = await client.deleteUserProperty(ctx.input.userProperty);
        return {
          output: { result: result.data ?? result },
          message: `Deleted user property "${ctx.input.userProperty}".`
        };
      }
    }

    // --- Event Categories ---
    if (resourceType === 'event_category') {
      if (action === 'get') {
        let name = ctx.input.categoryName;
        if (!name && ctx.input.categoryId) {
          let categories = await client.getEventCategories();
          let items = parseResponse(
            z.array(z.object({ id: z.union([z.string(), z.number()]), name: z.string() })),
            categories.data,
            'category list'
          );
          name = items.find(item => String(item.id) === ctx.input.categoryId)?.name;
          if (!name)
            throw amplitudeServiceError(
              `Event category "${ctx.input.categoryId}" was not found.`
            );
        }
        if (!name) throw amplitudeServiceError('categoryName or categoryId is required.');
        let result = await client.getEventCategory(name);
        return {
          output: { item: parseResponse(recordSchema, result.data, 'taxonomy lookup') },
          message: `Retrieved event category "${name}".`
        };
      }
      if (action === 'update') {
        if (!ctx.input.categoryId || !ctx.input.update?.newName)
          throw amplitudeServiceError('categoryId and update.newName are required.');
        let result = await client.updateEventCategory(
          ctx.input.categoryId,
          ctx.input.update.newName
        );
        return {
          output: { result },
          message: `Updated event category "${ctx.input.categoryId}".`
        };
      }
      if (action === 'list') {
        let result = await client.getEventCategories();
        return {
          output: {
            items: parseResponse(z.array(recordSchema), result.data, 'taxonomy list')
          },
          message: 'Listed all event categories.'
        };
      }
      if (action === 'create') {
        if (!ctx.input.create) {
          throw amplitudeServiceError('create parameters are required.');
        }
        let result = await client.createEventCategory({ name: ctx.input.create.name });
        return {
          output: { result: result.data ?? result },
          message: `Created event category "${ctx.input.create.name}".`
        };
      }
      if (action === 'delete') {
        if (!ctx.input.categoryId) throw amplitudeServiceError('categoryId is required.');
        let result = await client.deleteEventCategory(ctx.input.categoryId);
        return {
          output: { result: result.data ?? result },
          message: `Deleted event category "${ctx.input.categoryId}".`
        };
      }
    }

    throw amplitudeServiceError(
      `Unsupported action "${action}" for resource type "${resourceType}".`
    );
  })
  .build();
