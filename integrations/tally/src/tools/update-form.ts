import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let blockSchema = z.object({
  uuid: z.string().describe('Unique block identifier (UUID)'),
  type: z.string().describe('Block type'),
  groupUuid: z.string().describe('Group identifier for related blocks'),
  groupType: z.string().describe('Group category type'),
  payload: z.record(z.string(), z.any()).describe('Block-specific configuration')
});

export let updateForm = SlateTool.create(spec, {
  name: 'Update Form',
  key: 'update_form',
  description: `Update an existing Tally form's name, status, blocks, or settings. Use this to modify form structure, open/close a form, rename it, or change its configuration.`,
  instructions: [
    'Only provide the fields you want to update — unspecified fields remain unchanged.',
    'Set status to "PUBLISHED" to make a draft form live, or update isClosed in settings to stop accepting responses.'
  ]
})
  .input(
    z.object({
      formId: z.string().describe('The unique ID of the form to update'),
      name: z.string().optional().describe('New form name'),
      status: z.enum(['PUBLISHED', 'DRAFT']).optional().describe('New form status'),
      blocks: z
        .array(blockSchema)
        .optional()
        .describe('Updated form blocks (replaces all blocks)'),
      settings: z.record(z.string(), z.any()).optional().describe('Updated form settings')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the updated form'),
      updated: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.updateForm(ctx.input.formId, {
      name: ctx.input.name,
      status: ctx.input.status,
      blocks: ctx.input.blocks,
      settings: ctx.input.settings
    });

    return {
      output: {
        formId: ctx.input.formId,
        updated: true
      },
      message: `Successfully updated form **${ctx.input.formId}**.`
    };
  })
  .build();
