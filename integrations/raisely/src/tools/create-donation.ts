import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let createDonation = SlateTool.create(spec, {
  name: 'Create Donation',
  key: 'create_donation',
  description: `Record a donation in a Raisely campaign. Primarily used for importing offline or external donations. Specify amount in cents, the donor email, and optionally attach to a fundraising profile.`,
  instructions: [
    'Amount should be provided in the smallest currency unit (e.g. cents). For example, $50.00 = 5000.',
    'For offline donations, set mode to "offline".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      campaignUuid: z.string().describe('UUID of the campaign'),
      amount: z
        .number()
        .describe('Donation amount in the smallest currency unit (e.g. cents)'),
      currency: z
        .string()
        .optional()
        .describe('Currency code (e.g. "AUD", "USD"). Defaults to campaign currency.'),
      profileUuid: z
        .string()
        .optional()
        .describe('UUID of the fundraising profile to attribute donation to'),
      email: z.string().optional().describe('Donor email address'),
      firstName: z.string().optional().describe('Donor first name'),
      lastName: z.string().optional().describe('Donor last name'),
      anonymous: z.boolean().optional().describe('Whether the donation is anonymous'),
      mode: z
        .enum(['online', 'offline'])
        .optional()
        .describe('Donation mode (default: "offline" for API-created donations)'),
      message: z.string().optional().describe('Donation message from the donor'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      donation: z.record(z.string(), z.any()).describe('The created donation object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    let data: Record<string, any> = {
      amount: ctx.input.amount
    };
    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.profileUuid) data.profileUuid = ctx.input.profileUuid;
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.firstName) data.firstName = ctx.input.firstName;
    if (ctx.input.lastName) data.lastName = ctx.input.lastName;
    if (ctx.input.anonymous !== undefined) data.anonymous = ctx.input.anonymous;
    if (ctx.input.mode) data.mode = ctx.input.mode;
    if (ctx.input.message) data.message = ctx.input.message;
    if (ctx.input.customFields) data.public = ctx.input.customFields;

    let result = await client.createDonation(ctx.input.campaignUuid, data);
    let donation = result.data || result;

    return {
      output: { donation },
      message: `Created donation of **${ctx.input.amount}** (smallest unit) in campaign.`
    };
  })
  .build();
