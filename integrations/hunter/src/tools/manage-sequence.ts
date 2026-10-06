import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  entity,
  id,
  optionalBoolean,
  optionalNumber,
  optionalRow,
  optionalText,
  row,
  rows,
  text
} from '../lib/client';
import { spec } from '../spec';

export let manageSequence = SlateTool.create(spec, {
  name: 'Manage Sequence',
  key: 'manage_sequence',
  description: `Manage email sequences (campaigns) in Hunter. List all sequences, view recipients of a sequence, add recipients, cancel scheduled emails for a recipient, start a draft sequence, get its details, or pause/resume scheduled sending.`,
  instructions: [
    'To **list** all sequences, set action to "list".',
    'To **list recipients** of a sequence, set action to "list_recipients" and provide sequenceId.',
    'To **add recipients** to a sequence, set action to "add_recipients" and provide sequenceId along with emails or leadIds. Adding to an active sequence may trigger immediate email sending.',
    'To **cancel** scheduled emails for a recipient, set action to "cancel_recipient" and provide sequenceId and recipientEmail.',
    'To **start** a draft sequence, set action to "start" and provide sequenceId. This can send emails.',
    'Use get for sequence details, pause to stop scheduled sending, and resume to restart it. Resume can send emails.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'list_recipients',
          'add_recipients',
          'cancel_recipient',
          'start',
          'get',
          'pause',
          'resume'
        ])
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
            recipientsCount: z.number().nullable().describe('Number of recipients'),
            started: z.boolean().optional(),
            paused: z.boolean().optional(),
            archived: z.boolean().optional(),
            editable: z.boolean().optional(),
            ownerId: z.number().nullable().optional(),
            ownerEmail: z.string().nullable().optional()
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
            sendingStatus: z.string().nullable().describe('Sending status'),
            leadId: z
              .number()
              .nullable()
              .optional()
              .describe('Related lead ID; the lead may have been deleted')
          })
        )
        .optional()
        .describe('List of recipients (for list_recipients action)'),
      sequence: z
        .object({
          sequenceId: z.number(),
          name: z.string().nullable(),
          status: z.string().nullable(),
          recipientsCount: z.number().nullable(),
          started: z.boolean().optional(),
          paused: z.boolean().optional(),
          archived: z.boolean().optional(),
          editable: z.boolean().optional(),
          ownerId: z.number().nullable().optional(),
          ownerEmail: z.string().nullable().optional()
        })
        .optional(),
      paused: z.boolean().optional(),
      returnedCount: z.number().optional(),
      messagesCancelled: z.number().optional(),
      skippedRecipients: z
        .array(z.object({ email: z.string(), reason: z.string().optional() }))
        .optional(),
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
    const client = new Client({ token: ctx.auth.token });
    const mapSequence = (value: unknown) => {
      const c = entity(value),
        owner = optionalRow(c.owner);
      return {
        sequenceId: id(c.id),
        name: optionalText(c.name) ?? null,
        status: optionalText(c.status) ?? null,
        recipientsCount: optionalNumber(c.recipients_count) ?? null,
        started: optionalBoolean(c.started),
        paused: optionalBoolean(c.paused),
        archived: optionalBoolean(c.archived),
        editable: optionalBoolean(c.editable),
        ownerId: optionalNumber(owner.id) ?? null,
        ownerEmail: optionalText(owner.email) ?? null
      };
    };
    if (ctx.input.action === 'list') {
      const result = await client.listSequences({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      const sequences = rows(row(result.data).sequences).map(mapSequence);
      return {
        output: { sequences, returnedCount: sequences.length },
        message: `Retrieved **${sequences.length}** sequences.`
      };
    }
    const sequenceId = id(ctx.input.sequenceId);
    if (ctx.input.action === 'get')
      return {
        output: { sequence: mapSequence((await client.getSequence(sequenceId)).data) },
        message: `Retrieved sequence **${sequenceId}**.`
      };
    if (ctx.input.action === 'list_recipients') {
      const result = await client.listSequenceRecipients(sequenceId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      const recipients = rows(row(result.data).recipients).map(r => ({
        email: text(r.email, 'recipient email'),
        firstName: optionalText(r.first_name) ?? null,
        lastName: optionalText(r.last_name) ?? null,
        sendingStatus: optionalText(r.sending_status) ?? null,
        leadId: optionalNumber(r.lead_id) ?? null
      }));
      return {
        output: { recipients, returnedCount: recipients.length },
        message: `Retrieved **${recipients.length}** sequence recipients.`
      };
    }
    if (ctx.input.action === 'add_recipients') {
      const result = await client.addSequenceRecipients(sequenceId, {
        emails: ctx.input.emails,
        leadIds: ctx.input.leadIds
      });
      const data = row(result.data),
        count = optionalNumber(data.recipients_added);
      const skipped =
        data.skipped_recipients == null
          ? undefined
          : rows(data.skipped_recipients).map(r => ({
              email: text(r.email, 'recipient email'),
              reason: optionalText(r.reason)
            }));
      return {
        output: { recipientsAdded: count, skippedRecipients: skipped },
        message:
          'Hunter accepted the recipient request; consult the reported added count and skipped recipients.'
      };
    }
    if (ctx.input.action === 'cancel_recipient') {
      const email = text(ctx.input.recipientEmail, 'recipient email');
      const result = await client.cancelSequenceRecipient(sequenceId, email);
      const data = optionalRow(result.data);
      return {
        output: { cancelled: true, messagesCancelled: optionalNumber(data.messages_canceled) },
        message:
          'Hunter accepted cancellation of scheduled emails to the requested recipient. The recipient history is retained.'
      };
    }
    if (ctx.input.action === 'start') {
      const result = await client.startSequence(sequenceId);
      return {
        output: {
          started: true,
          recipientsCount: optionalNumber(optionalRow(result.data).recipients_count)
        },
        message: 'Hunter accepted starting the sequence; scheduled sending may begin.'
      };
    }
    if (ctx.input.action === 'pause') await client.pauseSequence(sequenceId);
    else await client.resumeSequence(sequenceId);
    let sequence: ReturnType<typeof mapSequence>;
    try {
      sequence = mapSequence((await client.getSequence(sequenceId)).data);
    } catch {
      throw createApiServiceError(
        'Hunter accepted the sequence transition, but its readback failed. Retrieve its state before deciding whether to repeat the write.',
        { reason: 'hunter_write_accepted_readback_failed' }
      );
    }
    return {
      output: { sequence, paused: sequence.paused },
      message: `Hunter accepted the sequence ${ctx.input.action} request; current provider state is included.`
    };
  })
  .build();
