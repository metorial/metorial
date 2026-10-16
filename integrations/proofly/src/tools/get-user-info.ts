import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prooflyBoolean, prooflyNumber, prooflyString } from '../lib/response';
import { spec } from '../spec';

export let getUserInfo = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Retrieve the authenticated user's account information, registration date, login count, impression statistics, and pixel settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().optional().describe('User name'),
      email: z.string().optional().describe('User email address'),
      registeredAt: z.string().optional().describe('Account registration date'),
      lastLoginAt: z.string().optional().describe('Last login timestamp'),
      impressionsCurrent: z
        .number()
        .optional()
        .describe('Impressions in the current billing period'),
      impressionsTotal: z.number().optional().describe('Total impressions across all periods'),
      loginCount: z.number().optional().describe('Number of account logins'),
      pixelKey: z.string().optional().describe('Tracking pixel key'),
      pixelDebug: z.boolean().optional().describe('Whether pixel debugging is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getUser();
    let meta = isApiErrorRecord(user.meta) ? user.meta : {};
    let impressions = isApiErrorRecord(user.impressions) ? user.impressions : {};
    let pixel = isApiErrorRecord(user.pixel) ? user.pixel : {};

    return {
      output: {
        name: prooflyString(user.name),
        email: prooflyString(user.email),
        registeredAt: prooflyString(
          meta.registered,
          user.registeredAt,
          user.registered_at,
          user.createdAt
        ),
        lastLoginAt: prooflyString(user.lastLoginAt, user.last_login_at),
        impressionsCurrent: prooflyNumber(
          impressions.period,
          user.impressionsCurrent,
          user.impressions_current
        ),
        impressionsTotal: prooflyNumber(
          impressions.total,
          user.impressionsTotal,
          user.impressions_total
        ),
        loginCount: prooflyNumber(meta.logins),
        pixelKey: prooflyString(pixel.key),
        pixelDebug: prooflyBoolean(pixel.debug)
      },
      message: 'Retrieved Proofly account information.'
    };
  })
  .build();
