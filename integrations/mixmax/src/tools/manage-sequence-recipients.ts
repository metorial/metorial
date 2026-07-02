import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addRecipientsToSequence = SlateTool.create(spec, {
  name: 'Add Recipients to Sequence',
  key: 'add_recipients_to_sequence',
  description: `Add one or more recipients to an automated email sequence. Each recipient can have custom personalization variables (e.g., first name, company) that will be substituted into the sequence's email templates.`,
  instructions: [
    'Variable names must match template placeholders exactly (e.g., "first name" for {{first name}}).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sequenceId: z.string().describe('ID of the sequence to add recipients to'),
      recipients: z
        .array(
          z.object({
            email: z.string().describe('Recipient email address'),
            variables: z
              .record(z.string(), z.string())
              .optional()
              .describe(
                'Personalization variables for the sequence templates (e.g., {"first name": "John", "company": "Acme"})'
              )
          })
        )
        .min(1)
        .describe('Recipients to add to the sequence')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the recipients were added successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.addRecipientsToSequence(ctx.input.sequenceId, ctx.input.recipients);

    return {
      output: {
        success: true
      },
      message: `Added ${ctx.input.recipients.length} recipient(s) to sequence.`
    };
  })
  .build();

export let cancelSequence = SlateTool.create(spec, {
  name: 'Cancel Sequence',
  key: 'cancel_sequence',
  description: `Cancel an active sequence for a specific recipient or cancel sequences in bulk. Stops all remaining stages from being sent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sequenceId: z
        .string()
        .optional()
        .describe('ID of the sequence to cancel (for single-sequence cancellation)'),
      recipientEmail: z
        .string()
        .optional()
        .describe('Email of the recipient to cancel the sequence for'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Emails to cancel across all sequences (for bulk cancellation)'),
      sequenceIds: z
        .array(z.string())
        .optional()
        .describe('Sequence IDs to cancel for all recipients (for bulk cancellation)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.sequenceId) {
      await client.cancelSequence(ctx.input.sequenceId, ctx.input.recipientEmail);
    } else {
      await client.bulkCancelSequences({
        emails: ctx.input.emails,
        sequenceIds: ctx.input.sequenceIds
      });
    }

    return {
      output: {
        success: true
      },
      message: ctx.input.sequenceId
        ? `Cancelled sequence ${ctx.input.sequenceId}${ctx.input.recipientEmail ? ` for ${ctx.input.recipientEmail}` : ''}.`
        : 'Bulk sequence cancellation completed.'
    };
  })
  .build();

export let listSequenceRecipients = SlateTool.create(spec, {
  name: 'List Sequence Recipients',
  key: 'list_sequence_recipients',
  description: `List the activated recipients of a specific sequence. Returns recipient details including their email and status. Uses offset-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sequenceId: z.string().describe('ID of the sequence'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 50, max: 300)'),
      offset: z.number().optional().describe('Offset for pagination (default: 0)')
    })
  )
  .output(
    z.object({
      recipients: z
        .array(
          z.object({
            email: z.string().optional().describe('Recipient email'),
            name: z.string().optional().describe('Recipient name'),
            variables: z
              .record(z.string(), z.string())
              .optional()
              .describe('Personalization variables'),
            status: z.string().optional().describe('Recipient status'),
            createdAt: z.string().optional().describe('When the recipient was added')
          })
        )
        .describe('List of recipients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getSequenceRecipients(ctx.input.sequenceId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let results = Array.isArray(data) ? data : data.results || [];
    let recipients = results.map((r: any) => ({
      email: r.email,
      name: r.name,
      variables: r.variables,
      status: r.status,
      createdAt: r.createdAt
    }));

    return {
      output: { recipients },
      message: `Found ${recipients.length} recipient(s) for the sequence.`
    };
  })
  .build();
