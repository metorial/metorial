import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let blockSchema = z.object({
  uuid: z.string().describe('Unique block identifier'),
  type: z.string().describe('Block type (e.g., FORM_TITLE, INPUT_TEXT, MULTIPLE_CHOICE)'),
  groupUuid: z.string().describe('Group identifier for related blocks'),
  groupType: z.string().describe('Group category type'),
  payload: z.record(z.string(), z.any()).describe('Block-specific configuration and content')
});

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve complete details of a specific Tally form including all blocks, settings, and metadata. Use this to inspect a form's structure, fields, conditional logic, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The unique ID of the form to retrieve')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique form identifier'),
      name: z.string().describe('Form name'),
      workspaceId: z.string().nullable().describe('Workspace the form belongs to'),
      status: z.string().describe('Form status'),
      numberOfSubmissions: z.number().describe('Total number of submissions'),
      isClosed: z.boolean().describe('Whether the form is closed'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp'),
      blocks: z.array(blockSchema).describe('All blocks that make up the form'),
      settings: z.record(z.string(), z.any()).describe('Form settings and configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let form = await client.getForm(ctx.input.formId);

    return {
      output: {
        formId: form.id,
        name: form.name,
        workspaceId: form.workspaceId,
        status: form.status,
        numberOfSubmissions: form.numberOfSubmissions,
        isClosed: form.isClosed,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        blocks: form.blocks,
        settings: form.settings
      },
      message: `Retrieved form **"${form.name}"** (${form.id}) with ${form.blocks.length} block(s) and ${form.numberOfSubmissions} submission(s).`
    };
  })
  .build();
