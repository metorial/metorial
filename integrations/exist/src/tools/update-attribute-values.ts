import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAttributeValuesTool = SlateTool.create(spec, {
  name: 'Update Attribute Values',
  key: 'update_attribute_values',
  description: `Set absolute values for owned attributes on specific dates. Overwrites any previous value for the given date. Supports batch updates of up to 35 values in a single call. You must own the attribute before updating its values.`,
  instructions: [
    'You must first acquire ownership of an attribute before updating it.',
    "Dates must be in YYYY-MM-DD format in the user's local timezone.",
    'Non-null values cannot be reverted to null.'
  ],
  constraints: [
    'Maximum 35 updates per call.',
    'Requires OAuth2 authentication with appropriate write scope.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      updates: z
        .array(
          z.object({
            attributeName: z.string().describe('Name of the attribute to update'),
            date: z.string().describe('Date to set the value for (YYYY-MM-DD)'),
            value: z.union([z.number(), z.string()]).describe('The absolute value to set')
          })
        )
        .min(1)
        .max(35)
        .describe('Array of attribute value updates')
    })
  )
  .output(
    z.object({
      successCount: z.number().describe('Number of successfully updated values'),
      failedCount: z.number().describe('Number of failed updates'),
      failures: z
        .array(
          z.object({
            attributeName: z.string().optional().describe('Attribute that failed'),
            error: z.string().describe('Error message')
          })
        )
        .describe('Details of any failed updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let payload = ctx.input.updates.map(u => ({
      name: u.attributeName,
      date: u.date,
      value: u.value
    }));

    let result = await client.updateAttributeValues(payload);

    let failures = result.failed.map(f => ({
      attributeName: (f as Record<string, unknown>).name as string | undefined,
      error: f.error
    }));

    return {
      output: {
        successCount: result.success.length,
        failedCount: result.failed.length,
        failures
      },
      message: `Updated **${result.success.length}** attribute value(s)${result.failed.length > 0 ? `, **${result.failed.length}** failed` : ''}.`
    };
  })
  .build();
