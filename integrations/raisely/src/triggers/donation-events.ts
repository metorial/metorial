import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let donationEvents = SlateTrigger.create(spec, {
  name: 'Donation Events',
  key: 'donation_events',
  description: 'Triggers when a donation is created, succeeded, updated, refunded, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of donation event'),
      donationUuid: z.string().describe('UUID of the donation'),
      donation: z
        .record(z.string(), z.any())
        .describe('Full donation object from the webhook payload')
    })
  )
  .output(
    z.object({
      donationUuid: z.string().describe('UUID of the donation'),
      campaignUuid: z.string().optional().describe('UUID of the campaign'),
      profileUuid: z
        .string()
        .optional()
        .describe('UUID of the profile the donation was made to'),
      userUuid: z.string().optional().describe('UUID of the donor'),
      amount: z.number().optional().describe('Donation amount in smallest currency unit'),
      currency: z.string().optional().describe('Currency code'),
      status: z.string().optional().describe('Donation status'),
      mode: z.string().optional().describe('Donation mode (online/offline)'),
      email: z.string().optional().describe('Donor email address'),
      firstName: z.string().optional().describe('Donor first name'),
      lastName: z.string().optional().describe('Donor last name'),
      anonymous: z.boolean().optional().describe('Whether the donation is anonymous'),
      donationMessage: z.string().optional().describe('Donation message'),
      createdAt: z.string().optional().describe('When the donation was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        campaignUuid: ctx.config.campaignUuid
      });
      let webhook = result.data || result;
      return { registrationDetails: { webhookUuid: webhook.uuid } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookUuid);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let type = String(data.type || '');
      if (!type.startsWith('donation.')) {
        return { inputs: [] };
      }
      let eventType = type.replace('donation.', '');
      let donation = (data.data || {}) as Record<string, any>;
      return {
        inputs: [
          {
            eventType,
            donationUuid: String(donation.uuid || data.uuid || ''),
            donation
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let d = ctx.input.donation as Record<string, any>;
      return {
        type: `donation.${ctx.input.eventType}`,
        id: ctx.input.donationUuid,
        output: {
          donationUuid: String(d.uuid || ctx.input.donationUuid),
          campaignUuid: d.campaignUuid as string | undefined,
          profileUuid: d.profileUuid as string | undefined,
          userUuid: d.userUuid as string | undefined,
          amount: d.amount as number | undefined,
          currency: d.currency as string | undefined,
          status: d.status as string | undefined,
          mode: d.mode as string | undefined,
          email: d.email as string | undefined,
          firstName: d.firstName as string | undefined,
          lastName: d.lastName as string | undefined,
          anonymous: d.anonymous as boolean | undefined,
          donationMessage: d.message as string | undefined,
          createdAt: d.createdAt as string | undefined
        }
      };
    }
  })
  .build();
