import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { requireValue, status, validateInput } from '../lib/contracts';
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
      unavailable: z.array(z.enum(['summary', 'settings'])).optional(),
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
    validateInput('get_account_summary', ctx.input, [ctx.auth.secretKey]);
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname,
      signingVersion: ctx.auth.signingVersion
    });

    let [infoResult, settingsResult] = await Promise.all([
      client.getAccountInfo().catch(error => {
        if (status(error) === 403) return null;
        throw error;
      }),
      client.getAccountSettings().catch(error => {
        if (status(error) === 403) return null;
        throw error;
      })
    ]);

    requireValue(
      infoResult || settingsResult,
      'The Admin API application needs Grant read information or Grant settings for account context.'
    );
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
          lockoutExpireDuration: settingsResult.response?.lockout_expire_duration ?? undefined,
          inactiveUserExpiration: settingsResult.response?.inactive_user_expiration,
          smsMessage: settingsResult.response?.sms_message || undefined,
          fraudEmail: settingsResult.response?.fraud_email || undefined,
          callerID: settingsResult.response?.caller_id || undefined,
          name: settingsResult.response?.name || undefined
        }
      : undefined;

    return {
      output: {
        summary,
        settings,
        unavailable: [
          ...(!infoResult ? ['summary' as const] : []),
          ...(!settingsResult ? ['settings' as const] : [])
        ]
      },
      message: `Retrieved account summary${summary?.userCount !== undefined ? ` — **${summary.userCount}** users, **${summary.integrationCount}** integrations` : ''}.`
    };
  })
  .build();
