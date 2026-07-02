import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let parkData = SlateTool.create(spec, {
  name: 'Park Form Data',
  key: 'park_data',
  description: `Pushes data to Formdesk temporarily and returns a ticket. When the ticket is used to open a form, the form fields are pre-filled with the parked data. Useful for pre-populating forms from external systems.`,
  instructions: [
    'Field keys must match the form field identifiers as defined in the Formdesk form builder.',
    'The returned ticket can be appended to the form URL to pre-fill the form.'
  ]
})
  .input(
    z.object({
      formName: z.string().describe('Name or identifier of the form to park data for'),
      fields: z
        .record(z.string(), z.string())
        .describe('Field data as key-value pairs to pre-fill the form with'),
      expires: z.number().optional().describe('Expiration time in seconds for the ticket'),
      reuse: z.boolean().optional().describe('Whether the ticket can be used multiple times'),
      preventChange: z
        .boolean()
        .optional()
        .describe('Whether to prevent changes to the pre-filled fields')
    })
  )
  .output(
    z.object({
      ticket: z
        .string()
        .describe('The ticket GUID that can be used to open the pre-filled form'),
      formUrl: z.string().optional().describe('The full form URL with ticket if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Parking form data...');
    let result = await client.parkData({
      formName: ctx.input.formName,
      fields: ctx.input.fields,
      expires: ctx.input.expires,
      reuse: ctx.input.reuse,
      preventChange: ctx.input.preventChange
    });

    let ticket = String(result?.ticket || result?.guid || result?.id || '');

    return {
      output: {
        ticket,
        formUrl: result?.url || undefined
      },
      message: `Data parked successfully. Ticket: **${ticket}**`
    };
  })
  .build();
