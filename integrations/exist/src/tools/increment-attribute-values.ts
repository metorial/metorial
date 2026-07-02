import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let incrementAttributeValuesTool = SlateTool.create(spec, {
  name: 'Increment Attribute Values',
  key: 'increment_attribute_values',
  description: `Add incremental (delta) values to owned attributes instead of setting absolute totals. Useful for event-driven tracking where Exist tallies the running total. If no date is provided, defaults to today.`,
  instructions: [
    'Cannot increment string, scale, or time-of-day attributes - only numeric types.',
    "If date is omitted, the increment applies to today's value in the user's timezone."
  ],
  constraints: [
    'Maximum 35 increments per call.',
    'Requires OAuth2 authentication with appropriate write scope.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      increments: z
        .array(
          z.object({
            attributeName: z.string().describe('Name of the attribute to increment'),
            value: z.number().describe('The delta value to add'),
            date: z
              .string()
              .optional()
              .describe('Date to apply the increment to (YYYY-MM-DD). Defaults to today.')
          })
        )
        .min(1)
        .max(35)
        .describe('Array of attribute value increments')
    })
  )
  .output(
    z.object({
      successCount: z.number().describe('Number of successfully incremented values'),
      failedCount: z.number().describe('Number of failed increments'),
      failures: z
        .array(
          z.object({
            attributeName: z.string().optional().describe('Attribute that failed'),
            error: z.string().describe('Error message')
          })
        )
        .describe('Details of any failed increments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let payload = ctx.input.increments.map(i => ({
      name: i.attributeName,
      value: i.value,
      date: i.date
    }));

    let result = await client.incrementAttributeValues(payload);

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
      message: `Incremented **${result.success.length}** attribute value(s)${result.failed.length > 0 ? `, **${result.failed.length}** failed` : ''}.`
    };
  })
  .build();
