import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

export let createContactRecord = SlateTool.create(spec, {
  name: 'Create Contact Record',
  key: 'create_contact_record',
  description: `Create an activity record (log entry) on an existing contact. Use this to track interactions like calls, emails, meetings, and follow-ups.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to add the record to'),
      message: z.string().describe('Message or note for the activity record'),
      commentType: z
        .string()
        .optional()
        .describe('Type of activity, e.g. "call", "email", "meeting", "note"'),
      email: z.string().optional().describe('Email address associated with this record'),
      phone: z.string().optional().describe('Phone number associated with this record'),
      followUpDate: z.string().optional().describe('Follow-up date in ISO 8601 format')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the created activity record'),
      contactId: z.string().describe('ID of the contact the record was added to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagneticClient({ token: ctx.auth.token });

    let data: Record<string, any> = {
      contact: { id: ctx.input.contactId },
      message: ctx.input.message,
      commentType: ctx.input.commentType,
      email: ctx.input.email,
      phone: ctx.input.phone,
      followUpDate: ctx.input.followUpDate
    };

    let response = await client.createContactRecord(data);

    return {
      output: {
        recordId: String(response.id),
        contactId: ctx.input.contactId
      },
      message: `Created activity record on contact ${ctx.input.contactId}.`
    };
  })
  .build();
