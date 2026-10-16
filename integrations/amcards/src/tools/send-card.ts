import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendCard = SlateTool.create(spec, {
  name: 'Send Card',
  key: 'send_card',
  description: `Create and send a personalized physical greeting card to a recipient. Select a Quicksend Template from your AMcards account and provide recipient and sender address details. AMcards prints and mails the card after accepting the request.`,
  instructions: [
    'Call list_quicksend_templates to discover a Quicksend Template configured in your AMcards account.',
    'The initiator field identifies who triggered the card send and is required.',
    'Provide a sendDate in YYYY-MM-DD format to schedule mailing. If omitted, AMcards schedules it for the following day.'
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
        .describe(
          'Quicksend Template ID. Call list_quicksend_templates to discover templates.'
        ),
      initiator: z
        .string()
        .describe(
          'Identifier for who triggered the card send (e.g. user name or system name).'
        ),
      message: z
        .string()
        .optional()
        .describe(
          'Message added to the inside panel; this does not replace the template message.'
        ),
      sendDate: z
        .string()
        .optional()
        .describe(
          'Scheduled send date in YYYY-MM-DD format. Omit to schedule for the following day.'
        ),
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
      fromLastName: z.string().optional().describe('Sender last name.'),
      fromAddressLine1: z
        .string()
        .optional()
        .describe('Sender street address, overriding the account default.'),
      fromAddressLine2: z.string().optional().describe('Sender second address line.'),
      fromCity: z.string().optional().describe('Sender city.'),
      fromState: z.string().optional().describe('Sender state, province, or region.'),
      fromPostalCode: z.string().optional().describe('Sender postal code.'),
      fromCountry: z.string().optional().describe('Sender country code.'),
      extraData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom merge fields for the template, keyed by field name.')
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
      totalCost: z.number().optional().describe('Cost charged in cents, when returned.'),
      rawResponse: z.any().optional().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendCard(ctx.input);

    let recipientName = `${ctx.input.recipientFirstName} ${ctx.input.recipientLastName}`;

    return {
      output: {
        cardId:
          result.card != null
            ? String(result.card)
            : result.id != null
              ? String(result.id)
              : undefined,
        status: result.status != null ? String(result.status) : undefined,
        recipientName,
        sendDate: result.send_date ?? ctx.input.sendDate,
        totalCost: result.total_cost,
        rawResponse: result
      },
      message: `Card request accepted for **${recipientName}** at ${ctx.input.recipientCity}, ${ctx.input.recipientState}${ctx.input.sendDate ? ` (scheduled for ${ctx.input.sendDate})` : ''}.`
    };
  })
  .build();
