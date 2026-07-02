import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update the current authenticated user's profile settings. Supports changing name, email, locale, and default currency.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('The user ID to update (must be the authenticated user)'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      email: z.string().optional().describe('New email address'),
      locale: z.string().optional().describe('New locale (e.g., "en")'),
      defaultCurrency: z
        .string()
        .optional()
        .describe('New default currency code (e.g., "USD")')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('Updated user ID'),
      firstName: z.string().describe('Updated first name'),
      lastName: z.string().nullable().describe('Updated last name'),
      email: z.string().describe('Updated email address'),
      defaultCurrency: z.string().optional().describe('Updated default currency code'),
      locale: z.string().optional().describe('Updated locale')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, string> = {};
    if (ctx.input.firstName) params.first_name = ctx.input.firstName;
    if (ctx.input.lastName) params.last_name = ctx.input.lastName;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.locale) params.locale = ctx.input.locale;
    if (ctx.input.defaultCurrency) params.default_currency = ctx.input.defaultCurrency;

    let user = await client.updateUser(ctx.input.userId, params);

    return {
      output: {
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name ?? null,
        email: user.email,
        defaultCurrency: user.default_currency,
        locale: user.locale
      },
      message: `Updated profile for **${user.first_name} ${user.last_name || ''}**`
    };
  })
  .build();
