import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactPropertyTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

let contactPropertyOutputSchema = z.object({
  contactPropertyId: z.string().describe('Contact property ID.'),
  key: z.string().optional().describe('Contact property key.'),
  type: contactPropertyTypeSchema.optional().describe('Contact property type.'),
  fallbackValue: z.any().optional().nullable().describe('Fallback value for this property.'),
  createdAt: z.string().optional().describe('Creation timestamp.')
});

let mapContactProperty = (property: any) => ({
  contactPropertyId: property.id,
  key: property.key,
  type: property.type,
  fallbackValue: property.fallback_value,
  createdAt: property.created_at
});

export let createContactProperty = SlateTool.create(spec, {
  name: 'Create Contact Property',
  key: 'create_contact_property',
  description: `Create a typed Resend contact property for storing personalization data on contacts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      key: z.string().describe('Property key, such as company_name.'),
      type: contactPropertyTypeSchema.describe('Property value type.'),
      fallbackValue: z
        .any()
        .optional()
        .describe('Fallback value used when a contact has no value.')
    })
  )
  .output(
    z.object({
      contactPropertyId: z.string().describe('ID of the created contact property.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createContactProperty({
      key: ctx.input.key,
      type: ctx.input.type,
      fallbackValue: ctx.input.fallbackValue
    });

    return {
      output: { contactPropertyId: result.id },
      message: `Contact property **${ctx.input.key}** created with ID \`${result.id}\`.`
    };
  })
  .build();

export let getContactProperty = SlateTool.create(spec, {
  name: 'Get Contact Property',
  key: 'get_contact_property',
  description: `Retrieve a Resend contact property by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactPropertyId: z.string().describe('Contact property ID.')
    })
  )
  .output(contactPropertyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let property = await client.getContactProperty(ctx.input.contactPropertyId);

    return {
      output: mapContactProperty(property),
      message: `Contact property **${property.key ?? property.id}** retrieved.`
    };
  })
  .build();

export let updateContactProperty = SlateTool.create(spec, {
  name: 'Update Contact Property',
  key: 'update_contact_property',
  description: `Update the fallback value for a Resend contact property. The key and type cannot be changed after creation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactPropertyId: z.string().describe('Contact property ID.'),
      fallbackValue: z
        .any()
        .optional()
        .nullable()
        .describe('Updated fallback value. Use null to clear it.')
    })
  )
  .output(
    z.object({
      contactPropertyId: z.string().describe('ID of the updated contact property.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let property = await client.updateContactProperty(ctx.input.contactPropertyId, {
      fallbackValue: ctx.input.fallbackValue
    });

    return {
      output: { contactPropertyId: property.id },
      message: `Contact property \`${property.id}\` updated.`
    };
  })
  .build();

export let listContactProperties = SlateTool.create(spec, {
  name: 'List Contact Properties',
  key: 'list_contact_properties',
  description: `List Resend contact properties configured for the authenticated team.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      contactProperties: z
        .array(contactPropertyOutputSchema)
        .describe('Configured contact properties.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listContactProperties({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let contactProperties = (result.data || []).map(mapContactProperty);

    return {
      output: {
        contactProperties,
        hasMore: result.has_more ?? false
      },
      message: `Found **${contactProperties.length}** contact propertie(s).`
    };
  })
  .build();

export let deleteContactProperty = SlateTool.create(spec, {
  name: 'Delete Contact Property',
  key: 'delete_contact_property',
  description: `Delete a Resend contact property definition.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactPropertyId: z.string().describe('Contact property ID.')
    })
  )
  .output(
    z.object({
      contactPropertyId: z.string().describe('Deleted contact property ID.'),
      deleted: z.boolean().describe('Whether the contact property was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteContactProperty(ctx.input.contactPropertyId);

    return {
      output: {
        contactPropertyId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Contact property \`${result.id}\` has been **deleted**.`
    };
  })
  .build();
