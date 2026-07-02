import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import type { SequenceEmail } from '../lib/types';
import { spec } from '../spec';

let formatSequenceEmail = (email: SequenceEmail) => ({
  emailId: email.id,
  sequenceId: email.sequence_id,
  subject: email.subject,
  previewText: email.preview_text,
  emailAddress: email.email_address,
  emailTemplateId: email.email_template_id,
  published: email.published,
  position: email.position,
  delayValue: email.delay_value,
  delayUnit: email.delay_unit,
  sendDays: email.send_days,
  content: email.content
});

export let manageSequenceEmails = SlateTool.create(spec, {
  name: 'Manage Sequence Emails',
  key: 'manage_sequence_emails',
  description:
    'List, create, get, update, or delete emails inside a Kit sequence. Sequence emails are the ordered steps subscribers receive after entering a sequence.',
  instructions: [
    'Use action "list" with sequenceId to retrieve emails in a sequence.',
    'Use action "create" with sequenceId, subject, delayValue, and delayUnit to create a draft sequence email.',
    'Use action "get" with sequenceId and emailId to retrieve one email including content.',
    'Use action "update" with sequenceId, emailId, and fields to change.',
    'Use action "delete" with sequenceId and emailId to permanently remove a sequence email.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete'])
        .describe('Action to perform'),
      sequenceId: z.number().optional().describe('Sequence ID (required for all actions)'),
      emailId: z
        .number()
        .optional()
        .describe('Sequence email ID (required for get/update/delete)'),
      subject: z.string().optional().describe('Subject line for create or update'),
      previewText: z
        .string()
        .nullable()
        .optional()
        .describe('Preview text for create or update'),
      content: z.string().nullable().optional().describe('HTML body content'),
      delayValue: z
        .number()
        .optional()
        .describe('Delay amount before sending this email after the previous one'),
      delayUnit: z
        .enum(['days', 'hours'])
        .optional()
        .describe(
          'Delay unit. Use days for schedule-aware delivery or hours for fixed delay.'
        ),
      emailTemplateId: z
        .number()
        .nullable()
        .optional()
        .describe('Email template ID, or null to clear on update'),
      published: z.boolean().optional().describe('Whether the email is active'),
      sendDays: z
        .array(
          z.enum([
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
          ])
        )
        .nullable()
        .optional()
        .describe('Days of week this email may send, or null to reset to all days'),
      position: z
        .number()
        .nullable()
        .optional()
        .describe('Zero-based position in the sequence, or null to append/reset'),
      includeContent: z
        .boolean()
        .optional()
        .describe('For list, include email content in each item'),
      perPage: z.number().optional().describe('Results per page for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      emails: z
        .array(
          z.object({
            emailId: z.number(),
            sequenceId: z.number(),
            subject: z.string(),
            previewText: z.string().nullable(),
            emailAddress: z.string(),
            emailTemplateId: z.number().nullable(),
            published: z.boolean(),
            position: z.number().nullable(),
            delayValue: z.number(),
            delayUnit: z.string(),
            sendDays: z.array(z.string()),
            content: z.string().nullable().optional()
          })
        )
        .optional()
        .describe('Sequence email records for list action'),
      email: z
        .object({
          emailId: z.number(),
          sequenceId: z.number(),
          subject: z.string(),
          previewText: z.string().nullable(),
          emailAddress: z.string(),
          emailTemplateId: z.number().nullable(),
          published: z.boolean(),
          position: z.number().nullable(),
          delayValue: z.number(),
          delayUnit: z.string(),
          sendDays: z.array(z.string()),
          content: z.string().nullable().optional()
        })
        .optional()
        .describe('Sequence email record for create, get, or update'),
      deleted: z.boolean().optional().describe('Whether the sequence email was deleted'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let input = ctx.input;

    if (!input.sequenceId) {
      throw kitServiceError('sequenceId is required');
    }

    if (input.action === 'list') {
      let result = await client.listSequenceEmails(input.sequenceId, {
        includeContent: input.includeContent,
        perPage: input.perPage,
        after: input.cursor
      });
      let emails = result.emails.map(formatSequenceEmail);
      return {
        output: {
          emails,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${emails.length}** sequence email(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (input.action === 'create') {
      if (!input.subject) throw kitServiceError('subject is required for create');
      if (input.delayValue === undefined)
        throw kitServiceError('delayValue is required for create');
      if (!input.delayUnit) throw kitServiceError('delayUnit is required for create');

      let email = await client.createSequenceEmail(input.sequenceId, {
        subject: input.subject,
        previewText: input.previewText,
        content: input.content,
        delayValue: input.delayValue,
        delayUnit: input.delayUnit,
        emailTemplateId: input.emailTemplateId,
        published: input.published,
        sendDays: input.sendDays,
        position: input.position
      });
      return {
        output: {
          email: formatSequenceEmail(email)
        },
        message: `Created sequence email **${email.subject}** (#${email.id})`
      };
    }

    if (!input.emailId) {
      throw kitServiceError(`emailId is required for ${input.action}`);
    }

    if (input.action === 'get') {
      let email = await client.getSequenceEmail(input.sequenceId, input.emailId);
      return {
        output: {
          email: formatSequenceEmail(email)
        },
        message: `Sequence email **${email.subject}** (#${email.id})`
      };
    }

    if (input.action === 'update') {
      let email = await client.updateSequenceEmail(input.sequenceId, input.emailId, {
        subject: input.subject,
        previewText: input.previewText,
        content: input.content,
        delayValue: input.delayValue,
        delayUnit: input.delayUnit,
        emailTemplateId: input.emailTemplateId,
        published: input.published,
        sendDays: input.sendDays,
        position: input.position
      });
      return {
        output: {
          email: formatSequenceEmail(email)
        },
        message: `Updated sequence email **${email.subject}** (#${email.id})`
      };
    }

    await client.deleteSequenceEmail(input.sequenceId, input.emailId);
    return {
      output: {
        deleted: true
      },
      message: `Deleted sequence email #${input.emailId}`
    };
  });
