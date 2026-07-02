import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountSummary = SlateTool.create(spec, {
  name: 'Get Account Summary',
  key: 'get_account_summary',
  description: `Retrieve a summary of the Duo account including user counts, integration counts, telephony credits, and current account settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      summary: z
        .object({
          adminCount: z.number().optional(),
          integrationCount: z.number().optional(),
          telephonyCreditsRemaining: z.number().optional(),
          userCount: z.number().optional()
        })
        .optional(),
      settings: z
        .object({
          lockoutThreshold: z.number().optional(),
          lockoutExpireDuration: z.number().optional(),
          inactiveUserExpiration: z.number().optional(),
          smsMessage: z.string().optional(),
          fraudEmail: z.string().optional(),
          callerID: z.string().optional(),
          name: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let [infoResult, settingsResult] = await Promise.all([
      client.getAccountInfo().catch(() => null),
      client.getAccountSettings().catch(() => null)
    ]);

    let summary = infoResult
      ? {
          adminCount: infoResult.response?.admin_count,
          integrationCount: infoResult.response?.integration_count,
          telephonyCreditsRemaining: infoResult.response?.telephony_credits_remaining,
          userCount: infoResult.response?.user_count
        }
      : undefined;

    let settings = settingsResult
      ? {
          lockoutThreshold: settingsResult.response?.lockout_threshold,
          lockoutExpireDuration: settingsResult.response?.lockout_expire_duration,
          inactiveUserExpiration: settingsResult.response?.inactive_user_expiration,
          smsMessage: settingsResult.response?.sms_message || undefined,
          fraudEmail: settingsResult.response?.fraud_email || undefined,
          callerID: settingsResult.response?.caller_id || undefined,
          name: settingsResult.response?.name || undefined
        }
      : undefined;

    return {
      output: { summary, settings },
      message: `Retrieved account summary${summary?.userCount !== undefined ? ` — **${summary.userCount}** users, **${summary.integrationCount}** integrations` : ''}.`
    };
  })
  .build();
