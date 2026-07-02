import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scheduleDripCampaign = SlateTool.create(spec, {
  name: 'Schedule Drip Campaign',
  key: 'schedule_drip_campaign',
  description: `Schedule a drip campaign to send a series of cards to a recipient over time. Campaigns are pre-configured in your AMcards account and triggered with recipient details. Supports personalization fields like birth date, phone number, and anniversary date.`,
  instructions: [
    'The campaignId must reference a drip campaign configured in your AMcards account.',
    'Optional FROM fields override the default sender address configured in the campaign.',
    'Birth date and anniversary date should be in YYYY-MM-DD format for proper personalization.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the drip campaign to schedule.'),
      initiator: z
        .string()
        .describe(
          'Identifier for who triggered the campaign (e.g. user name or system name).'
        ),
      sendDate: z
        .string()
        .optional()
        .describe(
          'Date to start the campaign in YYYY-MM-DD format. Omit to start immediately.'
        ),
      thirdPartyContactId: z
        .string()
        .optional()
        .describe('External CRM contact ID for tracking.'),
      recipientSalutation: z
        .string()
        .optional()
        .describe('Recipient salutation (e.g. "Mr.", "Mrs.", "Dr.").'),
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
      recipientCountry: z.string().optional().describe('Recipient country.'),
      recipientBirthDate: z
        .string()
        .optional()
        .describe('Recipient birth date in YYYY-MM-DD format for birthday personalization.'),
      recipientPhoneNumber: z.string().optional().describe('Recipient phone number.'),
      recipientAnniversaryDate: z
        .string()
        .optional()
        .describe(
          'Recipient anniversary date in YYYY-MM-DD format for anniversary personalization.'
        ),
      fromFirstName: z
        .string()
        .optional()
        .describe('Sender first name (overrides campaign default).'),
      fromLastName: z
        .string()
        .optional()
        .describe('Sender last name (overrides campaign default).'),
      fromAddressLine1: z
        .string()
        .optional()
        .describe('Sender street address line 1 (overrides campaign default).'),
      fromAddressLine2: z
        .string()
        .optional()
        .describe('Sender street address line 2 (overrides campaign default).'),
      fromCity: z.string().optional().describe('Sender city (overrides campaign default).'),
      fromState: z.string().optional().describe('Sender state (overrides campaign default).'),
      fromPostalCode: z
        .string()
        .optional()
        .describe('Sender postal code (overrides campaign default).'),
      fromCountry: z
        .string()
        .optional()
        .describe('Sender country (overrides campaign default).')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the campaign that was scheduled.'),
      recipientName: z.string().describe('Full name of the recipient.'),
      sendDate: z.string().optional().describe('Scheduled start date of the campaign.'),
      rawResponse: z.any().optional().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.scheduleDripCampaign({
      campaignId: ctx.input.campaignId,
      initiator: ctx.input.initiator,
      sendDate: ctx.input.sendDate,
      thirdPartyContactId: ctx.input.thirdPartyContactId,
      recipientSalutation: ctx.input.recipientSalutation,
      recipientFirstName: ctx.input.recipientFirstName,
      recipientLastName: ctx.input.recipientLastName,
      recipientOrganization: ctx.input.recipientOrganization,
      recipientAddressLine1: ctx.input.recipientAddressLine1,
      recipientAddressLine2: ctx.input.recipientAddressLine2,
      recipientCity: ctx.input.recipientCity,
      recipientState: ctx.input.recipientState,
      recipientPostalCode: ctx.input.recipientPostalCode,
      recipientCountry: ctx.input.recipientCountry,
      recipientBirthDate: ctx.input.recipientBirthDate,
      recipientPhoneNumber: ctx.input.recipientPhoneNumber,
      recipientAnniversaryDate: ctx.input.recipientAnniversaryDate,
      fromFirstName: ctx.input.fromFirstName,
      fromLastName: ctx.input.fromLastName,
      fromAddressLine1: ctx.input.fromAddressLine1,
      fromAddressLine2: ctx.input.fromAddressLine2,
      fromCity: ctx.input.fromCity,
      fromState: ctx.input.fromState,
      fromPostalCode: ctx.input.fromPostalCode,
      fromCountry: ctx.input.fromCountry
    });

    let recipientName = `${ctx.input.recipientFirstName} ${ctx.input.recipientLastName}`;

    return {
      output: {
        campaignId: ctx.input.campaignId,
        recipientName,
        sendDate: ctx.input.sendDate ?? undefined,
        rawResponse: result
      },
      message: `Drip campaign **${ctx.input.campaignId}** scheduled for **${recipientName}**${ctx.input.sendDate ? ` starting on ${ctx.input.sendDate}` : ''}.`
    };
  })
  .build();
