import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { AddressZenClient } from '../lib/client';
import { spec } from '../spec';

let limitSchema = z.number().int().nonnegative().nullable().optional();

export let updateKeySettings = SlateTool.create(spec, {
  name: 'Update API Key Settings',
  key: 'update_key_settings',
  description:
    'Update the name, lookup limits, allowed URLs, data-retention period, or IP forwarding for an API key. Requires its account Management Key on the connection. Only supplied settings change.',
  constraints: ['Keys on unlimited plans ignore daily and monthly limit changes.']
})
  .input(
    z.object({
      apiKey: z.string().min(1).describe('API key whose settings should change'),
      name: z
        .string()
        .max(32)
        .regex(/^[\w\s]{0,32}$/)
        .optional()
        .describe('Key name, up to 32 letters, digits, underscores, or whitespace'),
      dailyLimit: limitSchema.describe('Daily lookup limit; null disables the limit'),
      monthlyLimit: limitSchema.describe('Monthly lookup limit; null disables the limit'),
      individualLimit: limitSchema.describe(
        'Daily lookup limit per IP address; null disables the limit'
      ),
      allowedUrls: z
        .array(z.string().max(256).regex(/^\S+$/))
        .max(10)
        .optional()
        .describe(
          'Allowed origins or wildcard domains; an empty array disables the URL restriction'
        ),
      redactDays: z
        .number()
        .int()
        .min(0)
        .max(1095)
        .optional()
        .describe('Days to retain personal data in lookup history; 0 prevents its storage'),
      ipForwarding: z
        .boolean()
        .optional()
        .describe('Accept source IP addresses in the AZ-Source-IP header')
    })
  )
  .output(
    z.object({
      name: z.string().optional(),
      dailyLimit: z.number().nullable().optional(),
      monthlyLimit: z.number().nullable().optional(),
      individualLimit: z.number().nullable().optional(),
      allowedUrls: z.array(z.string()).optional(),
      redactDays: z.number().optional(),
      ipForwarding: z.boolean().optional(),
      code: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let updates = pickDefined({
      name: ctx.input.name,
      daily_limit:
        ctx.input.dailyLimit === undefined ? undefined : { limit: ctx.input.dailyLimit },
      monthly_limit:
        ctx.input.monthlyLimit === undefined ? undefined : { limit: ctx.input.monthlyLimit },
      individual_limit:
        ctx.input.individualLimit === undefined
          ? undefined
          : { limit: ctx.input.individualLimit },
      allowed_urls: ctx.input.allowedUrls,
      redact_days: ctx.input.redactDays,
      ip_forwarding: ctx.input.ipForwarding
    });
    if (Object.keys(updates).length === 0) {
      throw createApiServiceError('Provide at least one API key setting to update.');
    }
    let result = await new AddressZenClient(ctx.auth).updateKeyDetails(
      ctx.input.apiKey,
      updates
    );
    let key = result.result;
    return {
      output: {
        name: key.name,
        dailyLimit: key.daily_limit?.limit,
        monthlyLimit: key.monthly_limit?.limit,
        individualLimit: key.individual_limit?.limit,
        allowedUrls: key.allowed_urls,
        redactDays: key.redact_days,
        ipForwarding: key.ip_forwarding,
        code: result.code
      },
      message: 'Updated API key settings.'
    };
  })
  .build();
