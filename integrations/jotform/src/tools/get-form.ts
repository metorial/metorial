import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFormTool = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve detailed information about a specific JotForm form including its properties, questions, and settings. Use this to inspect a form's configuration or get its current state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The ID of the form to retrieve')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique form identifier'),
      title: z.string().describe('Form title'),
      status: z.string().describe('Form status'),
      createdAt: z.string().describe('Form creation date'),
      updatedAt: z.string().describe('Last update date'),
      submissionCount: z.string().describe('Total number of submissions'),
      url: z.string().describe('Public URL of the form'),
      height: z.string().optional().describe('Form height in pixels'),
      questions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of question IDs to question definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let form = await client.getForm(ctx.input.formId);
    let questions = await client.getFormQuestions(ctx.input.formId);

    return {
      output: {
        formId: String(form.id),
        title: form.title || '',
        status: form.status || '',
        createdAt: form.created_at || '',
        updatedAt: form.updated_at || '',
        submissionCount: String(form.count || '0'),
        url: form.url || '',
        height: form.height ? String(form.height) : undefined,
        questions: questions || undefined
      },
      message: `Retrieved form **${form.title}** (ID: ${form.id}) with ${form.count || 0} submissions.`
    };
  })
  .build();
