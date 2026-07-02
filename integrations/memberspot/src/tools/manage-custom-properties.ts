import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomPropertiesTool = SlateTool.create(spec, {
  name: 'Manage Custom Properties',
  key: 'manage_custom_properties',
  description: `List available custom property definitions, or set custom property values on a user. When only listing is needed, omit the email and properties fields. To set values, provide the user's email and the properties to update.`,
  instructions: [
    'To list available custom properties, call without email or properties.',
    'To set property values on a user, provide both email and properties.',
    'Use the "List Offers" tool to find offer IDs, and this tool to find custom property IDs.'
  ]
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe(
          'Email of the user to set properties on. Omit to list available properties.'
        ),
      properties: z
        .array(
          z.object({
            propertyId: z.string().describe('ID of the custom property'),
            value: z.string().describe('Value to set for the property')
          })
        )
        .optional()
        .describe('Custom properties to set on the user. Omit to list available properties.')
    })
  )
  .output(
    z.object({
      customProperties: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of available custom property definitions (when listing)'),
      result: z
        .record(z.string(), z.any())
        .optional()
        .describe('Result of setting properties (when updating)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.email && ctx.input.properties && ctx.input.properties.length > 0) {
      let result = await client.setCustomProperties({
        email: ctx.input.email,
        properties: ctx.input.properties
      });
      return {
        output: { result },
        message: `Set **${ctx.input.properties.length}** custom property/properties on **${ctx.input.email}**.`
      };
    }

    let result = await client.listCustomProperties();
    let customProperties = Array.isArray(result) ? result : (result?.properties ?? [result]);

    return {
      output: { customProperties },
      message: `Retrieved **${customProperties.length}** custom property definition(s).`
    };
  })
  .build();
