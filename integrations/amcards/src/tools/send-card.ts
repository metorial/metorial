import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendCard = SlateTool.create(spec, {
  name: 'Send Card',
  key: 'send_card',
  description: `Create and send a personalized physical greeting card to a recipient. Select a Quicksend Template from your AMcards account and provide recipient and sender address details. Cards are physically printed, stuffed, and mailed by AMcards, typically delivered in 2–5 business days.`,
  instructions: [
    'The quicksendTemplateId must reference a Quicksend Template configured in your AMcards account.',
    'The initiator field identifies who triggered the card send and is required.',
    'Provide a sendDate in YYYY-MM-DD format to schedule future delivery, or omit to send immediately.'
  ],
  constraints: [
    'Card messages have a maximum of 700 characters.',
    'Cards can only be edited until 11:59 PM on the same day they are sent.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      quicksendTemplateId: z
        .string()
        .describe('ID of the Quicksend Template to use for the card.'),
      initiator: z
        .string()
        .describe(
          'Identifier for who triggered the card send (e.g. user name or system name).'
        ),
      message: z
        .string()
        .optional()
        .describe('Custom message to include on the card (max 700 characters).'),
      sendDate: z
        .string()
        .optional()
        .describe('Scheduled send date in YYYY-MM-DD format. Omit to send immediately.'),
      thirdPartyContactId: z
        .string()
        .optional()
        .describe('External CRM contact ID for linking the card to a third-party system.'),
      recipientFirstName: z.string().describe('Recipient first name.'),
      recipientLastName: z.string().describe('Recipient last name.'),
      recipientOrganization: z
        .string()
        .optional()
        .describe('Recipient organization or company name.'),
      recipientAddressLine1: z.string().describe('Recipient street address line 1.'),
      recipientAddressLine2: z
        .string()
        .optional()
        .describe('Recipient street address line 2.'),
      recipientCity: z.string().describe('Recipient city.'),
      recipientState: z.string().describe('Recipient state, province, or region.'),
      recipientPostalCode: z.string().describe('Recipient postal or zip code.'),
      recipientCountry: z.string().optional().describe('Recipient country (e.g. "US").'),
      fromFirstName: z.string().describe('Sender first name.'),
      fromLastName: z.string().optional().describe('Sender last name.')
    })
  )
  .output(
    z.object({
      cardId: z
        .string()
        .optional()
        .describe('ID of the created card, if returned by the API.'),
      status: z.string().optional().describe('Current status of the card.'),
      recipientName: z.string().describe('Full name of the recipient.'),
      sendDate: z.string().optional().describe('Scheduled or actual send date.'),
      rawResponse: z.any().optional().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendCard({
      quicksendTemplateId: ctx.input.quicksendTemplateId,
      initiator: ctx.input.initiator,
      message: ctx.input.message,
      sendDate: ctx.input.sendDate,
      thirdPartyContactId: ctx.input.thirdPartyContactId,
      recipientFirstName: ctx.input.recipientFirstName,
      recipientLastName: ctx.input.recipientLastName,
      recipientOrganization: ctx.input.recipientOrganization,
      recipientAddressLine1: ctx.input.recipientAddressLine1,
      recipientAddressLine2: ctx.input.recipientAddressLine2,
      recipientCity: ctx.input.recipientCity,
      recipientState: ctx.input.recipientState,
      recipientPostalCode: ctx.input.recipientPostalCode,
      recipientCountry: ctx.input.recipientCountry,
      fromFirstName: ctx.input.fromFirstName,
      fromLastName: ctx.input.fromLastName
    });

    let recipientName = `${ctx.input.recipientFirstName} ${ctx.input.recipientLastName}`;

    return {
      output: {
        cardId: result?.id != null ? String(result.id) : undefined,
        status: result?.status ?? undefined,
        recipientName,
        sendDate: ctx.input.sendDate ?? undefined,
        rawResponse: result
      },
      message: `Card sent to **${recipientName}** at ${ctx.input.recipientCity}, ${ctx.input.recipientState}${ctx.input.sendDate ? ` (scheduled for ${ctx.input.sendDate})` : ''}.`
    };
  })
  .build();
