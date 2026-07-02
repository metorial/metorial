import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContactTool = SlateTool.create(spec, {
  name: 'Get Contact Details',
  key: 'get_contact',
  description: `Retrieve detailed information for a specific contact, including their email addresses and phone numbers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The unique ID of the contact')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).describe('Contact details'),
      emailAddresses: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Contact email addresses'),
      phoneNumbers: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Contact phone numbers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { contactId } = ctx.input;

    let contact = await client.getContact(contactId);

    let emailAddresses: any[];
    let phoneNumbers: any[];

    try {
      let emailResult = await client.getContactEmailAddresses(contactId);
      emailAddresses = Array.isArray(emailResult)
        ? emailResult
        : (emailResult?.items ?? emailResult?.data ?? []);
    } catch (_e) {
      emailAddresses = [];
    }

    try {
      let phoneResult = await client.getContactPhoneNumbers(contactId);
      phoneNumbers = Array.isArray(phoneResult)
        ? phoneResult
        : (phoneResult?.items ?? phoneResult?.data ?? []);
    } catch (_e) {
      phoneNumbers = [];
    }

    return {
      output: { contact, emailAddresses, phoneNumbers },
      message: `Retrieved details for contact **${contactId}** with ${emailAddresses.length} email(s) and ${phoneNumbers.length} phone number(s).`
    };
  })
  .build();
