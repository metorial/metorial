import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let blockSchema = z.object({
  uuid: z.string().describe('Unique block identifier (UUID)'),
  type: z
    .string()
    .describe(
      'Block type (e.g., FORM_TITLE, INPUT_TEXT, MULTIPLE_CHOICE, DROPDOWN, CHECKBOXES, etc.)'
    ),
  groupUuid: z.string().describe('Group identifier for related blocks'),
  groupType: z.string().describe('Group category type'),
  payload: z.record(z.string(), z.any()).describe('Block-specific configuration')
});

export let createForm = SlateTool.create(spec, {
  name: 'Create Form',
  key: 'create_form',
  description: `Create a new Tally form with optional blocks and settings. Forms can be created in PUBLISHED or draft status, and optionally placed in a workspace.

Supports all Tally block types including text inputs, multiple choice, dropdowns, file uploads, signatures, payments, and more.`,
  instructions: [
    'Each block requires a uuid, type, groupUuid, groupType, and payload.',
    'Common block types: FORM_TITLE, INPUT_TEXT, TEXTAREA, INPUT_EMAIL, INPUT_NUMBER, INPUT_PHONE_NUMBER, INPUT_DATE, INPUT_TIME, INPUT_LINK, MULTIPLE_CHOICE, DROPDOWN, CHECKBOXES, LINEAR_SCALE, FILE_UPLOAD, RATING, SIGNATURE, PAYMENT, HIDDEN_FIELDS, CALCULATED_FIELDS.'
  ]
})
  .input(
    z.object({
      status: z
        .enum(['PUBLISHED', 'DRAFT'])
        .optional()
        .describe('Form status (defaults to DRAFT if not specified)'),
      workspaceId: z.string().optional().describe('Workspace ID to place the form in'),
      blocks: z
        .array(blockSchema)
        .optional()
        .describe('Form blocks defining the form structure and fields'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Form settings (e.g., redirectOnCompletion, isClosed, password)')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique form identifier'),
      name: z.string().describe('Form name'),
      status: z.string().describe('Form status'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let form = await client.createForm({
      status: ctx.input.status,
      workspaceId: ctx.input.workspaceId,
      blocks: ctx.input.blocks,
      settings: ctx.input.settings
    });

    return {
      output: {
        formId: form.id,
        name: form.name,
        status: form.status,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt
      },
      message: `Created form **"${form.name}"** (${form.id}) with status **${form.status}**.`
    };
  })
  .build();
