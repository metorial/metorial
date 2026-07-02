import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve your Kit account information including account name, plan type, primary email address, and timezone settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number().describe('Kit account ID'),
      accountName: z.string().describe('Account display name'),
      planType: z.string().describe('Current subscription plan type'),
      primaryEmail: z.string().describe('Primary email address for the account'),
      createdAt: z.string().describe('Account creation timestamp'),
      timezoneName: z.string().optional().describe('IANA account timezone name'),
      timezoneFriendlyName: z.string().optional().describe('Human-readable timezone name'),
      timezoneUtcOffset: z.string().optional().describe('Account timezone UTC offset'),
      sendingAddresses: z
        .array(
          z.object({
            emailAddress: z.string(),
            fromName: z.string(),
            status: z.string(),
            isDefault: z.boolean(),
            isVerified: z.boolean(),
            isDmarcConfigured: z.boolean()
          })
        )
        .optional()
        .describe('Configured sending addresses'),
      userId: z.number().describe('User ID associated with the account'),
      userEmail: z.string().describe('User email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let data = await client.getAccount();

    return {
      output: {
        accountId: data.account.id,
        accountName: data.account.name,
        planType: data.account.plan_type,
        primaryEmail: data.account.primary_email_address,
        createdAt: data.account.created_at,
        timezoneName: data.account.timezone?.name,
        timezoneFriendlyName: data.account.timezone?.friendly_name,
        timezoneUtcOffset: data.account.timezone?.utc_offset,
        sendingAddresses: data.account.sending_addresses?.map(address => ({
          emailAddress: address.email_address,
          fromName: address.from_name,
          status: address.status,
          isDefault: address.is_default,
          isVerified: address.is_verified,
          isDmarcConfigured: address.is_dmarc_configured
        })),
        userId: data.user.id,
        userEmail: data.user.email
      },
      message: `Account **${data.account.name}** (${data.account.plan_type} plan) — ${data.account.primary_email_address}`
    };
  });
