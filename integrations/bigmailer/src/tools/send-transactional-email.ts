import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTransactionalEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_transactional_email',
  description: `Send a transactional email through a pre-configured campaign. The campaign must first be set up in the BigMailer console with from address, subject, and body template. This also upserts the contact: if the email does not exist, a new contact is created; if it exists, the contact is updated.`,
  instructions: [
    'The campaign must be configured in the BigMailer console before sending via API.',
    'field_values are stored permanently on the contact and can be used for segmentation.',
    'variables are used only for merge tag replacement in this send and are then discarded.',
    'Field values support string, date (YYYY-MM-DD), and integer types.'
  ]
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      campaignId: z.string().describe('ID of the transactional campaign'),
      email: z.string().describe('Recipient email address'),
      fieldValues: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            stringValue: z.string().optional().describe('String value'),
            dateValue: z.string().optional().describe('Date value (YYYY-MM-DD)'),
            integerValue: z.number().optional().describe('Integer value')
          })
        )
        .optional()
        .describe('Field values stored on the contact, used for merge tags and segmentation'),
      variables: z
        .array(
          z.object({
            name: z.string().describe('Variable name (merge tag)'),
            value: z.string().describe('Replacement value (supports HTML)')
          })
        )
        .optional()
        .describe('Temporary variables for merge tag replacement in this send only')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let fieldValues = ctx.input.fieldValues?.map(fv => ({
      name: fv.name,
      ...(fv.stringValue !== undefined ? { string: fv.stringValue } : {}),
      ...(fv.dateValue !== undefined ? { date: fv.dateValue } : {}),
      ...(fv.integerValue !== undefined ? { integer: fv.integerValue } : {})
    }));

    await client.sendTransactionalEmail(ctx.input.brandId, ctx.input.campaignId, {
      email: ctx.input.email,
      field_values: fieldValues,
      variables: ctx.input.variables
    });

    return {
      output: {
        sent: true
      },
      message: `Sent transactional email to **${ctx.input.email}** via campaign ${ctx.input.campaignId}.`
    };
  })
  .build();
