import { SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  firstName: z.string().describe('Recipient first name'),
  lastName: z.string().describe('Recipient last name'),
  company: z.string().optional().describe('Recipient company name'),
  addressStreet: z.string().describe('Street address line 1'),
  addressStreet2: z.string().optional().describe('Street address line 2'),
  addressCity: z.string().describe('City'),
  addressState: z.string().describe('State abbreviation (e.g. CA, NY)'),
  addressZip: z.string().describe('ZIP code'),
  country: z.string().optional().describe('Country (US or CA)'),
  varField1: z.string().optional().describe('Custom variable field 1 for template merge'),
  varField2: z.string().optional().describe('Custom variable field 2 for template merge'),
  varField3: z.string().optional().describe('Custom variable field 3 for template merge'),
  varField4: z.string().optional().describe('Custom variable field 4 for template merge'),
  varField5: z.string().optional().describe('Custom variable field 5 for template merge'),
  varField6: z.string().optional().describe('Custom variable field 6'),
  varField7: z.string().optional().describe('Custom variable field 7'),
  varField8: z.string().optional().describe('Custom variable field 8'),
  varField9: z.string().optional().describe('Custom variable field 9'),
  varField10: z.string().optional().describe('Custom variable field 10')
});

export let sendMail = SlateTool.create(spec, {
  name: 'Send Mail Piece',
  key: 'send_mail',
  description: `Send a personalized postcard, letter, or self-mailer to a single recipient via a triggered drip campaign. Requires a pre-configured campaign endpoint (found in the campaign's triggered drip settings). The mail piece will use the campaign's template and personalize it with the provided contact data and variable fields.`,
  instructions: [
    'You must first create a Triggered Drip Campaign in Postalytics and obtain the campaign endpoint identifier.',
    'Variable fields (varField1-10) correspond to merge fields in your template.'
  ],
  constraints: [
    'Rate limited to 15 requests per second.',
    'Only US and Canadian addresses are supported.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignEndpoint: z
        .string()
        .describe(
          'The campaign endpoint identifier from your Triggered Drip Campaign settings'
        ),
      recipient: contactSchema.describe('Recipient contact information')
    })
  )
  .output(
    z.object({
      sendDate: z
        .string()
        .optional()
        .describe('Timestamp when the mail piece was queued for sending'),
      mailPieceId: z.string().optional().describe('Unique identifier for the sent mail piece'),
      raw: z.record(z.string(), z.unknown()).describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.sendMailPiece(ctx.input.campaignEndpoint, ctx.input.recipient);

    return {
      output: {
        sendDate: result.send_date as string | undefined,
        mailPieceId: result.id as string | undefined,
        raw: result
      },
      message: `Mail piece sent to **${ctx.input.recipient.firstName} ${ctx.input.recipient.lastName}** at ${ctx.input.recipient.addressCity}, ${ctx.input.recipient.addressState} ${ctx.input.recipient.addressZip}.`
    };
  })
  .build();
