import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTextBroadcast = SlateTool.create(spec, {
  name: 'Create Text Broadcast',
  key: 'create_text_broadcast',
  description: `Create and send an SMS/MMS text message broadcast to a list of contacts. Requires a keyword ID and supports up to 10 messages per broadcast. Supports scheduling, SMS concatenation, and shortcode sending.`,
  instructions: [
    'You must have a valid keywordId before creating a text broadcast.',
    'Use sendImmediately=true to send right away, or provide sendAt for scheduling.',
    "Enable concatenateSms to combine multiple SMS segments into one message on the recipient's device."
  ],
  constraints: ['Maximum of 10 messages per broadcast.']
})
  .input(
    z.object({
      name: z.string().describe('Name for the text broadcast.'),
      keywordId: z.string().describe('Keyword ID associated with this broadcast.'),
      messages: z.array(z.string()).min(1).max(10).describe('Messages to send (up to 10).'),
      contacts: z
        .array(
          z.object({
            phone: z.string().describe('Phone number of the contact.'),
            firstName: z.string().optional().describe('First name of the contact.'),
            lastName: z.string().optional().describe('Last name of the contact.'),
            email: z.string().optional().describe('Email of the contact.')
          })
        )
        .describe('List of contacts to text.'),
      sendImmediately: z.boolean().optional().describe('Send the broadcast immediately.'),
      sendAt: z
        .string()
        .optional()
        .describe('Schedule time in ISO format, e.g. "2024-07-25T12:00:00+0000".'),
      sendEmail: z.boolean().optional().describe('Also send an email to contacts.'),
      shortcodeId: z.string().optional().describe('Shortcode ID to send from.'),
      concatenateSms: z
        .boolean()
        .optional()
        .describe('Combine SMS segments into one message on device.'),
      accessAccountId: z.string().optional().describe('Schedule as a specific access account.')
    })
  )
  .output(
    z.object({
      broadcastId: z.string().optional(),
      name: z.string().optional(),
      creditCost: z.number().optional(),
      totalRecipients: z.number().optional(),
      sendAt: z.string().optional(),
      pendingCancel: z.boolean().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      name,
      keywordId,
      messages,
      contacts,
      sendImmediately,
      sendAt,
      sendEmail,
      shortcodeId,
      concatenateSms,
      accessAccountId
    } = ctx.input;

    let result = await client.createText({
      name,
      keyword_id: keywordId,
      messages,
      contacts: contacts.map(c => ({
        phone: c.phone,
        firstname: c.firstName,
        lastname: c.lastName,
        email: c.email
      })),
      send_immediately: sendImmediately,
      send_at: sendAt,
      send_email: sendEmail,
      shortcode_id: shortcodeId,
      concatenate_sms: concatenateSms,
      accessaccount_id: accessAccountId
    });

    return {
      output: {
        broadcastId: result.id,
        name: result.name,
        creditCost: result.credit_cost,
        totalRecipients: result.total_recipients,
        sendAt: result.send_at,
        pendingCancel: result.pending_cancel,
        createdAt: result.created_at
      },
      message: `Text broadcast **${result.name}** created with ID \`${result.id}\`. Recipients: ${result.total_recipients ?? 'N/A'}, Credits: ${result.credit_cost ?? 'N/A'}.`
    };
  })
  .build();
