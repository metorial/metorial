import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createFormTool = SlateTool.create(spec, {
  name: 'Create Form',
  key: 'create_form',
  description: `Create a new JotForm form with specified questions and properties. Questions are defined as a map of order indices to question objects, each with a type, text, and optional configuration.`,
  instructions: [
    'Questions should be keyed by order index (e.g., "1", "2", "3").',
    'Each question requires at least a "type" (e.g., "control_textbox", "control_email", "control_dropdown") and "text" (label).',
    'Common question types: control_textbox, control_textarea, control_email, control_phone, control_dropdown, control_radio, control_checkbox, control_datetime, control_number, control_fileupload, control_head (section heading), control_button (submit button).'
  ]
})
  .input(
    z.object({
      questions: z
        .record(z.string(), z.record(z.string(), z.any()))
        .describe(
          'Map of question order indices to question definitions. Each question should have "type" and "text" at minimum.'
        ),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Form-level properties such as title, height, thankurl, etc.'),
      emails: z
        .record(z.string(), z.record(z.string(), z.any()))
        .optional()
        .describe('Email notification configurations keyed by index.')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the newly created form'),
      title: z.string().describe('Title of the new form'),
      url: z.string().describe('Public URL of the new form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let result = await client.createForm({
      questions: ctx.input.questions,
      properties: ctx.input.properties,
      emails: ctx.input.emails
    });

    return {
      output: {
        formId: String(result.id),
        title: result.title || '',
        url: result.url || ''
      },
      message: `Created form **${result.title || 'Untitled'}** (ID: ${result.id}).`
    };
  })
  .build();
