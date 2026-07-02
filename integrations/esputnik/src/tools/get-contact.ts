import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by their eSputnik internal contact ID. Returns full contact details including channels, custom fields, address, and segment membership.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('eSputnik internal contact ID')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('eSputnik internal contact ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      channels: z
        .array(
          z.object({
            type: z.string().describe('Channel type'),
            value: z.string().describe('Channel value')
          })
        )
        .optional()
        .describe('Contact channels'),
      fields: z
        .array(
          z.object({
            id: z.number().describe('Custom field ID'),
            value: z.string().optional().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom fields'),
      address: z
        .object({
          region: z.string().optional(),
          town: z.string().optional(),
          address: z.string().optional(),
          postcode: z.string().optional(),
          countryCode: z.string().optional()
        })
        .optional()
        .describe('Contact address'),
      groups: z.array(z.string()).optional().describe('Segment names'),
      externalCustomerId: z.string().optional().describe('External customer ID'),
      languageCode: z.string().optional().describe('Language code'),
      timeZone: z.string().optional().describe('Timezone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contact = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        channels: contact.channels,
        fields: contact.fields,
        address: contact.address,
        groups: contact.groups,
        externalCustomerId: contact.externalCustomerId,
        languageCode: contact.languageCode,
        timeZone: contact.timeZone
      },
      message: `Retrieved contact **${contact.firstName || ''} ${contact.lastName || ''}** (ID: ${contact.id}).`
    };
  })
  .build();
