import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let formSubmission = SlateTrigger.create(spec, {
  name: 'Form Submission',
  key: 'form_submission',
  description:
    'Triggers when a new form submission is received. Configure the webhook URL in the Getform/Forminit dashboard under Automation -> Send Webhook Request.'
})
  .input(
    z.object({
      submissionId: z.string().describe('Unique identifier for this submission event.'),
      formId: z.string().describe('The form endpoint ID that received the submission.'),
      submissionDate: z.string().describe('When the submission was received.'),
      blocks: z
        .record(z.string(), z.unknown())
        .describe('Submitted data organized by block type.'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .describe('Full raw webhook payload from Getform/Forminit.')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('The form endpoint ID that received the submission.'),
      submissionDate: z.string().describe('When the submission was received.'),
      senderEmail: z.string().optional().describe('Email from the sender block, if provided.'),
      senderFirstName: z
        .string()
        .optional()
        .describe('First name from the sender block, if provided.'),
      senderLastName: z
        .string()
        .optional()
        .describe('Last name from the sender block, if provided.'),
      senderPhone: z
        .string()
        .optional()
        .describe('Phone number from the sender block, if provided.'),
      senderCompany: z
        .string()
        .optional()
        .describe('Company from the sender block, if provided.'),
      blocks: z
        .record(z.string(), z.unknown())
        .describe('All submitted data organized by block type (text, email, rating, etc.).'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .describe('Full raw webhook payload for advanced use cases.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let formId = (data.form_id ?? data.formId ?? data.form ?? '') as string;
      let submissionDate = (data.created_at ??
        data.createdAt ??
        data.date ??
        data.submissionDate ??
        new Date().toISOString()) as string;

      let blocks: Record<string, unknown> = {};
      if (data.blocks && typeof data.blocks === 'object') {
        blocks = data.blocks as Record<string, unknown>;
      } else {
        let knownMeta = new Set([
          'form_id',
          'formId',
          'form',
          'created_at',
          'createdAt',
          'date',
          'submissionDate',
          'id',
          'hashId',
          'submission_id'
        ]);
        for (let [key, value] of Object.entries(data)) {
          if (!knownMeta.has(key)) {
            blocks[key] = value;
          }
        }
      }

      let submissionId = (data.hashId ??
        data.id ??
        data.submission_id ??
        `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`) as string;

      return {
        inputs: [
          {
            submissionId: String(submissionId),
            formId,
            submissionDate: String(submissionDate),
            blocks,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let sender = ctx.input.blocks.sender as Record<string, string> | undefined;

      return {
        type: 'submission.created',
        id: ctx.input.submissionId,
        output: {
          formId: ctx.input.formId,
          submissionDate: ctx.input.submissionDate,
          senderEmail: sender?.email,
          senderFirstName: sender?.firstName,
          senderLastName: sender?.lastName,
          senderPhone: sender?.phone,
          senderCompany: sender?.company,
          blocks: ctx.input.blocks,
          rawPayload: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
