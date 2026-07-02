import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let recipientBlacklisted = SlateTrigger.create(spec, {
  name: 'Recipient Blacklisted',
  key: 'recipient_blacklisted',
  description: 'Triggers whenever a recipient has been blacklisted from receiving mail.'
})
  .input(
    z.object({
      webhookId: z.number().optional().describe('Webhook ID'),
      event: z.string().describe('Event type'),
      created: z.string().optional().describe('Event creation timestamp'),
      retries: z.string().optional().describe('Number of retry attempts'),
      recipients: z
        .array(z.any())
        .optional()
        .describe('Array of recipient objects that were blacklisted')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('Blacklisted recipient ID'),
      firstname: z.string().optional().describe('Recipient first name'),
      lastname: z.string().optional().describe('Recipient last name'),
      email: z.string().optional().describe('Recipient email'),
      company: z.string().optional().describe('Company name'),
      address1: z.string().optional().describe('Primary address line'),
      city: z.string().optional().describe('City'),
      country: z.string().optional().describe('Country'),
      postcode: z.string().optional().describe('Postal/zip code')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.event === 'test_url') {
        return { inputs: [] };
      }

      let recipients: any[] = data.recipients || data.data || [];
      if (!Array.isArray(recipients)) {
        recipients = [recipients];
      }

      return {
        inputs: recipients.map((recipient: any) => ({
          webhookId: data.webhook_id,
          event: data.event || 'recipient_blacklisted',
          created: data.created,
          retries: data.retries,
          recipients: [recipient]
        }))
      };
    },

    handleEvent: async ctx => {
      let recipient = ctx.input.recipients?.[0];

      return {
        type: 'recipient.blacklisted',
        id: `recipient-blacklisted-${recipient?.id || 'unknown'}-${ctx.input.created || Date.now()}`,
        output: {
          recipientId: String(recipient?.id || ''),
          firstname: recipient?.firstname,
          lastname: recipient?.lastname,
          email: recipient?.email,
          company: recipient?.company,
          address1: recipient?.address1,
          city: recipient?.city,
          country: recipient?.country,
          postcode: recipient?.postcode || recipient?.zipcode
        }
      };
    }
  })
  .build();
