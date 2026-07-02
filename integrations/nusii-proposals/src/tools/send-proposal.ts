import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendProposal = SlateTool.create(spec, {
  name: 'Send Proposal',
  key: 'send_proposal',
  description: `Send a proposal to one or multiple recipients via email. Supports custom subject, message body, CC/BCC, and per-recipient signing eligibility.`,
  instructions: [
    'Use either "recipientEmail" for a single recipient or "recipients" for multiple (up to 10).',
    'Each recipient in the "recipients" array can be marked as eligible to sign the proposal.'
  ],
  constraints: [
    'Maximum 10 recipients per send.',
    'Subject to account active proposal plan limits.'
  ]
})
  .input(
    z.object({
      proposalId: z.string().describe('The ID of the proposal to send'),
      recipientEmail: z
        .string()
        .optional()
        .describe('Single recipient email (use this or recipients, not both)'),
      recipients: z
        .array(
          z.object({
            name: z.string().optional().describe('Recipient name'),
            email: z.string().describe('Recipient email address'),
            eligibleToSign: z
              .boolean()
              .optional()
              .describe('Whether this recipient can sign the proposal')
          })
        )
        .optional()
        .describe('Multiple recipients (up to 10)'),
      subject: z.string().optional().describe('Custom email subject line'),
      message: z.string().optional().describe('Custom email message body'),
      cc: z.string().optional().describe('CC email address'),
      bcc: z.string().optional().describe('BCC email address'),
      senderId: z.number().optional().describe('User ID of the sender'),
      senderEmail: z.string().optional().describe('Sender email address'),
      saveEmailTemplate: z
        .boolean()
        .optional()
        .describe('Save this email as a template for future sends')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Send status'),
      sentAt: z.string().describe('Timestamp when the proposal was sent'),
      senderId: z.number().nullable().describe('ID of the sender'),
      senderName: z.string().describe('Name of the sender')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.sendProposal(ctx.input.proposalId, {
      email: ctx.input.recipientEmail,
      recipients: ctx.input.recipients,
      subject: ctx.input.subject,
      message: ctx.input.message,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      senderId: ctx.input.senderId,
      senderEmail: ctx.input.senderEmail,
      saveEmailTemplate: ctx.input.saveEmailTemplate
    });

    return {
      output: result,
      message: `Proposal sent successfully by **${result.senderName}** at ${result.sentAt}.`
    };
  })
  .build();
