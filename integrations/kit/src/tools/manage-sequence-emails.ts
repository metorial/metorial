import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

let daySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

let sequenceEmailSchema = z.object({
  emailId: z.number().describe('Sequence email ID'),
  sequenceId: z.number().describe('Sequence ID'),
  subject: z.string().describe('Email subject line'),
  previewText: z.string().nullable().describe('Preview text'),
  emailAddress: z.string().nullable().optional().describe('Sending email address'),
  emailTemplateId: z.number().nullable().describe('Email template ID'),
  published: z.boolean().describe('Whether the email is published'),
  position: z.number().nullable().describe('Zero-based email position'),
  delayValue: z.number().describe('Delay value'),
  delayUnit: z.string().describe('Delay unit'),
  sendDays: z.array(z.string()).nullable().describe('Allowed send days'),
  content: z.string().nullable().optional().describe('Email HTML content')
});

export let manageSequenceEmails = SlateTool.create(spec, {
  name: 'Manage Sequence Emails',
  key: 'manage_sequence_emails',
  description: `Create, get, update, delete, and list the individual email steps inside a Kit sequence.`,
  instructions: [
    'Create sequence emails as drafts with published=false unless you explicitly intend to send.',
    'Only the first email in a sequence can use delayValue=0 with delayUnit=days.',
    'Use includeContent for list only when the email HTML body is needed.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      sequenceId: z.number().describe('Sequence ID'),
      emailId: z
        .number()
        .optional()
        .describe('Sequence email ID (required for get, update, delete)'),
      subject: z.string().optional().describe('Subject line (required for create)'),
      delayValue: z
        .number()
        .optional()
        .describe('Number of days or hours to wait before sending'),
      delayUnit: z
        .enum(['days', 'hours'])
        .optional()
        .describe('Delay unit (required for create)'),
      previewText: z.string().nullable().optional().describe('Email preview text'),
      content: z.string().nullable().optional().describe('HTML email body'),
      emailTemplateId: z.number().nullable().optional().describe('Email template ID'),
      published: z.boolean().optional().describe('Whether the email is published'),
      sendDays: z
        .array(daySchema)
        .nullable()
        .optional()
        .describe('Allowed send days for day-based sequence emails'),
      position: z.number().nullable().optional().describe('Zero-based email position'),
      includeContent: z.boolean().optional().describe('Include content when listing emails'),
      perPage: z.number().optional().describe('Number of results per page (max 1000)'),
      afterCursor: z.string().optional().describe('Pagination cursor to fetch next page'),
      beforeCursor: z.string().optional().describe('Pagination cursor to fetch previous page')
    })
  )
  .output(
    z.object({
      emails: z.array(sequenceEmailSchema).optional().describe('List of sequence emails'),
      email: sequenceEmailSchema.optional().describe('Single sequence email'),
      deleted: z.boolean().optional().describe('Whether the email was deleted'),
      hasNextPage: z.boolean().optional().describe('Whether more results are available'),
      endCursor: z.string().nullable().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapEmail = (email: any) => ({
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

    let requireEmailId = (action: string) => {
      if (!ctx.input.emailId) {
        throw kitServiceError(`Sequence email ID is required for ${action}`);
      }

      return ctx.input.emailId;
    };

    if (ctx.input.action === 'list') {
      let result = await client.listSequenceEmails(ctx.input.sequenceId, {
        includeContent: ctx.input.includeContent,
        perPage: ctx.input.perPage,
        after: ctx.input.afterCursor,
        before: ctx.input.beforeCursor
      });
      let emails = result.data.map(mapEmail);
      return {
        output: {
          emails,
          hasNextPage: result.pagination.has_next_page,
          endCursor: result.pagination.end_cursor
        },
        message: `Found **${emails.length}** emails in sequence \`${ctx.input.sequenceId}\`.`
      };
    }

    if (ctx.input.action === 'get') {
      let data = await client.getSequenceEmail(ctx.input.sequenceId, requireEmailId('get'));
      return {
        output: { email: mapEmail(data.email) },
        message: `Retrieved sequence email **${data.email.subject}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.subject) {
        throw kitServiceError('subject is required for create');
      }
      if (ctx.input.delayValue === undefined) {
        throw kitServiceError('delayValue is required for create');
      }
      if (!ctx.input.delayUnit) {
        throw kitServiceError('delayUnit is required for create');
      }

      let data = await client.createSequenceEmail(ctx.input.sequenceId, {
        subject: ctx.input.subject,
        delayValue: ctx.input.delayValue,
        delayUnit: ctx.input.delayUnit,
        previewText: ctx.input.previewText,
        content: ctx.input.content,
        emailTemplateId: ctx.input.emailTemplateId,
        published: ctx.input.published,
        sendDays: ctx.input.sendDays,
        position: ctx.input.position
      });
      return {
        output: { email: mapEmail(data.email) },
        message: `Created sequence email **${data.email.subject}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let data = await client.updateSequenceEmail(
        ctx.input.sequenceId,
        requireEmailId('update'),
        {
          subject: ctx.input.subject,
          delayValue: ctx.input.delayValue,
          delayUnit: ctx.input.delayUnit,
          previewText: ctx.input.previewText,
          content: ctx.input.content,
          emailTemplateId: ctx.input.emailTemplateId,
          published: ctx.input.published,
          sendDays: ctx.input.sendDays,
          position: ctx.input.position
        }
      );
      return {
        output: { email: mapEmail(data.email) },
        message: `Updated sequence email **${data.email.subject}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let emailId = requireEmailId('delete');
      await client.deleteSequenceEmail(ctx.input.sequenceId, emailId);
      return {
        output: { deleted: true },
        message: `Deleted sequence email \`${emailId}\`.`
      };
    }

    throw kitServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
