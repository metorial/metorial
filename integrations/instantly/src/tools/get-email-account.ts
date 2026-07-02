import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmailAccount = SlateTool.create(spec, {
  name: 'Get Email Account',
  key: 'get_email_account',
  description: `Retrieve full details of a specific email sending account by its email address. Includes warmup settings, tracking domain, status, and sending configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountEmail: z.string().describe('Email address of the account to retrieve.')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Account email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      status: z.number().optional().describe('Account status'),
      dailyLimit: z.number().optional().describe('Daily sending limit'),
      sendingGap: z.number().optional().describe('Gap between sends in seconds'),
      warmupScore: z.number().optional().describe('Warmup score'),
      providerCode: z.number().optional().describe('Email provider code'),
      trackingDomainName: z.string().optional().describe('Custom tracking domain'),
      trackingDomainStatus: z.string().optional().describe('Tracking domain status'),
      setupPending: z.boolean().optional().describe('Whether setup is pending'),
      isManagedAccount: z.boolean().optional().describe('Whether this is a managed account'),
      enableSlowRamp: z.boolean().optional().describe('Whether slow ramp is enabled'),
      warmup: z.any().optional().describe('Warmup configuration'),
      timestampCreated: z.string().optional().describe('Creation timestamp'),
      timestampUpdated: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let a = await client.getAccount(ctx.input.accountEmail);

    return {
      output: {
        email: a.email,
        firstName: a.first_name,
        lastName: a.last_name,
        status: a.status,
        dailyLimit: a.daily_limit,
        sendingGap: a.sending_gap,
        warmupScore: a.stat_warmup_score,
        providerCode: a.provider_code,
        trackingDomainName: a.tracking_domain_name,
        trackingDomainStatus: a.tracking_domain_status,
        setupPending: a.setup_pending,
        isManagedAccount: a.is_managed_account,
        enableSlowRamp: a.enable_slow_ramp,
        warmup: a.warmup,
        timestampCreated: a.timestamp_created,
        timestampUpdated: a.timestamp_updated
      },
      message: `Retrieved email account **${a.email}** (status: ${a.status}).`
    };
  })
  .build();
