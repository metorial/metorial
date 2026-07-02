import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSequence = SlateTool.create(spec, {
  name: 'Manage Sequence',
  key: 'manage_sequence',
  description: `Manage email sequences (campaigns) in Hunter. List all sequences, view recipients of a sequence, add recipients, cancel scheduled emails for a recipient, or start a draft sequence.`,
  instructions: [
    'To **list** all sequences, set action to "list".',
    'To **list recipients** of a sequence, set action to "list_recipients" and provide sequenceId.',
    'To **add recipients** to a sequence, set action to "add_recipients" and provide sequenceId along with emails or leadIds. Adding to an active sequence may trigger immediate email sending.',
    'To **cancel** scheduled emails for a recipient, set action to "cancel_recipient" and provide sequenceId and recipientEmail.',
    'To **start** a draft sequence, set action to "start" and provide sequenceId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'list_recipients', 'add_recipients', 'cancel_recipient', 'start'])
        .describe('Action to perform'),
      sequenceId: z.number().optional().describe('Sequence (campaign) ID'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to add as recipients (max 50, for add_recipients)'),
      leadIds: z
        .array(z.number())
        .optional()
        .describe('Lead IDs to add as recipients (max 50, for add_recipients)'),
      recipientEmail: z
        .string()
        .optional()
        .describe('Email of recipient to cancel (for cancel_recipient)'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return (for list and list_recipients)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      sequences: z
        .array(
          z.object({
            sequenceId: z.number().describe('Sequence ID'),
            name: z.string().nullable().describe('Sequence name'),
            status: z.string().nullable().describe('Sequence status'),
            recipientsCount: z.number().nullable().describe('Number of recipients')
          })
        )
        .optional()
        .describe('List of sequences (for list action)'),
      recipients: z
        .array(
          z.object({
            email: z.string().describe('Recipient email'),
            firstName: z.string().nullable().describe('First name'),
            lastName: z.string().nullable().describe('Last name'),
            sendingStatus: z.string().nullable().describe('Sending status')
          })
        )
        .optional()
        .describe('List of recipients (for list_recipients action)'),
      recipientsAdded: z
        .number()
        .optional()
        .describe('Number of recipients added (for add_recipients)'),
      cancelled: z
        .boolean()
        .optional()
        .describe('Whether scheduled emails were cancelled (for cancel_recipient)'),
      started: z.boolean().optional().describe('Whether the sequence was started (for start)'),
      recipientsCount: z
        .number()
        .optional()
        .describe('Total recipients in the sequence (for start)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listSequences({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let sequences = (result.data?.campaigns || []).map((c: any) => ({
        sequenceId: c.id,
        name: c.name ?? null,
        status: c.status ?? null,
        recipientsCount: c.recipients_count ?? null
      }));
      return {
        output: { sequences },
        message: `Retrieved **${sequences.length}** sequences.`
      };
    }

    if (ctx.input.action === 'list_recipients') {
      if (!ctx.input.sequenceId)
        throw new Error('sequenceId is required for list_recipients action');
      let result = await client.listSequenceRecipients(ctx.input.sequenceId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let recipients = (result.data?.recipients || []).map((r: any) => ({
        email: r.email,
        firstName: r.first_name ?? null,
        lastName: r.last_name ?? null,
        sendingStatus: r.sending_status ?? null
      }));
      return {
        output: { recipients },
        message: `Retrieved **${recipients.length}** recipients for sequence **${ctx.input.sequenceId}**.`
      };
    }

    if (ctx.input.action === 'add_recipients') {
      if (!ctx.input.sequenceId)
        throw new Error('sequenceId is required for add_recipients action');
      let result = await client.addSequenceRecipients(ctx.input.sequenceId, {
        emails: ctx.input.emails,
        leadIds: ctx.input.leadIds
      });
      let count =
        result.data?.recipients_count ??
        (ctx.input.emails?.length ?? 0) + (ctx.input.leadIds?.length ?? 0);
      return {
        output: { recipientsAdded: count },
        message: `Added **${count}** recipients to sequence **${ctx.input.sequenceId}**.`
      };
    }

    if (ctx.input.action === 'cancel_recipient') {
      if (!ctx.input.sequenceId)
        throw new Error('sequenceId is required for cancel_recipient action');
      if (!ctx.input.recipientEmail)
        throw new Error('recipientEmail is required for cancel_recipient action');
      await client.cancelSequenceRecipient(ctx.input.sequenceId, ctx.input.recipientEmail);
      return {
        output: { cancelled: true },
        message: `Cancelled scheduled emails for **${ctx.input.recipientEmail}** in sequence **${ctx.input.sequenceId}**.`
      };
    }

    // start
    if (!ctx.input.sequenceId) throw new Error('sequenceId is required for start action');
    let result = await client.startSequence(ctx.input.sequenceId);
    return {
      output: {
        started: true,
        recipientsCount: result.data?.recipients_count ?? null
      },
      message: `Started sequence **${ctx.input.sequenceId}**.`
    };
  })
  .build();
