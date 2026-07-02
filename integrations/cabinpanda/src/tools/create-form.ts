import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let createForm = SlateTool.create(spec, {
  name: 'Create Form',
  key: 'create_form',
  description: `Create a new form with specified name, fields, and settings. Supports standard, conversational, pop-up, and scheduling form types.`,
  instructions: [
    'Common template IDs: 1 (Blank), 84 (Planets), 85 (Cyanic Globe).',
    'The typeId controls the form style (e.g., standard, conversational).'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name of the form'),
      typeId: z.string().optional().describe('Type identifier for the form style'),
      templateId: z.string().optional().describe('Template ID to use for the form layout'),
      fields: z.array(z.any()).optional().describe('Array of field definitions for the form'),
      settings: z.record(z.string(), z.any()).optional().describe('Additional form settings')
    })
  )
  .output(
    z.object({
      formId: z.string().optional().describe('Unique identifier (key) of the created form'),
      name: z.string().optional().describe('Name of the created form'),
      raw: z.any().optional().describe('Full form object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    let form = await client.createForm({
      name: ctx.input.name,
      typeId: ctx.input.typeId,
      templateId: ctx.input.templateId,
      fields: ctx.input.fields,
      settings: ctx.input.settings
    });

    return {
      output: {
        formId: form?.key ?? form?.id?.toString(),
        name: form?.name,
        raw: form
      },
      message: `Created form **${form?.name ?? ctx.input.name}**.`
    };
  })
  .build();
