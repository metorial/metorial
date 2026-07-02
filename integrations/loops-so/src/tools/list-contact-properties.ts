import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContactProperties = SlateTool.create(spec, {
  name: 'List Contact Properties',
  key: 'list_contact_properties',
  description: `Retrieve all contact properties defined on your Loops account. Returns both default properties (email, firstName, etc.) and custom properties with their key, label, and type. Useful for discovering available property keys when creating or updating contacts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum(['all', 'custom'])
        .optional()
        .describe(
          'Filter properties: "all" returns default and custom, "custom" returns only custom properties (defaults to "all")'
        )
    })
  )
  .output(
    z.object({
      properties: z
        .array(
          z.object({
            key: z.string().describe('Property key used in API requests (camelCase)'),
            label: z.string().describe('Human-readable label for the property'),
            type: z
              .string()
              .describe('Property data type (e.g., string, number, boolean, date)')
          })
        )
        .describe('List of contact properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let properties = await client.listContactProperties(ctx.input.filter || 'all');

    return {
      output: { properties },
      message: `Found **${properties.length}** contact propert${properties.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
