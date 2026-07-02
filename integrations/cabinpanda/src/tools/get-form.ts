import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve details of a specific form by its ID. Returns the form's configuration including name, fields, settings, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The 32-character alphanumeric key of the form to retrieve')
    })
  )
  .output(
    z.object({
      formId: z.string().optional().describe('Unique identifier (key) of the form'),
      name: z.string().optional().describe('Name of the form'),
      status: z.string().optional().describe('Current status of the form'),
      fields: z.any().optional().describe('Form fields configuration'),
      settings: z.any().optional().describe('Form settings'),
      createdAt: z.string().optional().describe('When the form was created'),
      updatedAt: z.string().optional().describe('When the form was last updated'),
      raw: z.any().optional().describe('Full form object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    let form = await client.getForm(ctx.input.formId);

    return {
      output: {
        formId: form?.key ?? form?.id?.toString(),
        name: form?.name,
        status: form?.status,
        fields: form?.fields,
        settings: form?.settings,
        createdAt: form?.created_at,
        updatedAt: form?.updated_at,
        raw: form
      },
      message: `Retrieved form **${form?.name ?? ctx.input.formId}**.`
    };
  })
  .build();
