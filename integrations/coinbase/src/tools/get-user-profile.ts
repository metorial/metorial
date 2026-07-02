import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinbaseClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve the authenticated user's profile including name, email, time zone, native currency, and avatar URL. Also lists available payment methods.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includePaymentMethods: z
        .boolean()
        .optional()
        .describe('Whether to also fetch linked payment methods')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      name: z.string().optional().nullable().describe('User display name'),
      email: z.string().optional().nullable().describe('User email address'),
      avatarUrl: z.string().optional().nullable().describe('Profile image URL'),
      nativeCurrency: z.string().optional().describe("User's native currency code"),
      timeZone: z.string().optional().nullable().describe("User's time zone"),
      country: z.string().optional().nullable().describe('User country code'),
      createdAt: z.string().optional().describe('Account creation date'),
      paymentMethods: z
        .array(
          z.object({
            paymentMethodId: z.string(),
            paymentMethodType: z.string().optional(),
            name: z.string().optional(),
            currency: z.string().optional(),
            primaryBuy: z.boolean().optional(),
            primarySell: z.boolean().optional(),
            allowBuy: z.boolean().optional(),
            allowSell: z.boolean().optional(),
            allowDeposit: z.boolean().optional(),
            allowWithdraw: z.boolean().optional()
          })
        )
        .optional()
        .describe('Linked payment methods')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinbaseClient({ token: ctx.auth.token });

    let user = await client.getCurrentUser();

    let paymentMethods: any[] | undefined;
    if (ctx.input.includePaymentMethods) {
      let pmResult = await client.listPaymentMethods();
      paymentMethods = (pmResult.data || []).map((pm: any) => ({
        paymentMethodId: pm.id,
        paymentMethodType: pm.type,
        name: pm.name,
        currency: pm.currency,
        primaryBuy: pm.primary_buy,
        primarySell: pm.primary_sell,
        allowBuy: pm.allow_buy,
        allowSell: pm.allow_sell,
        allowDeposit: pm.allow_deposit,
        allowWithdraw: pm.allow_withdraw
      }));
    }

    return {
      output: {
        userId: user.id,
        name: user.name || null,
        email: user.email || null,
        avatarUrl: user.avatar_url || null,
        nativeCurrency: user.native_currency,
        timeZone: user.time_zone || null,
        country: user.country?.code || null,
        createdAt: user.created_at,
        paymentMethods
      },
      message: `User **${user.name || user.email || user.id}** — ${user.native_currency}${paymentMethods ? `, ${paymentMethods.length} payment method(s)` : ''}`
    };
  })
  .build();
