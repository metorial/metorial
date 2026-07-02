import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let useTemplateTool = SlateTool.create(spec, {
  name: 'Create Document from Template',
  key: 'use_template',
  description: `Generate a new document from an existing template. Override recipient details and prefill field values to customize each instance. The resulting document can then be distributed for signing.`,
  instructions: [
    'The templateId must reference an envelope of type TEMPLATE.',
    'recipientId in recipientOverrides refers to the placeholder recipient ID from the template.'
  ]
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template envelope to use'),
      recipientOverrides: z
        .array(
          z.object({
            recipientId: z
              .number()
              .describe('ID of the placeholder recipient in the template'),
            email: z.string().optional().describe('Email address for this recipient'),
            name: z.string().optional().describe('Display name for this recipient')
          })
        )
        .optional()
        .describe('Override recipient details from the template'),
      prefillFields: z
        .array(
          z.object({
            fieldId: z.number().describe('ID of the field in the template'),
            value: z.string().describe('Value to prefill the field with')
          })
        )
        .optional()
        .describe('Prefill field values')
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the newly created document envelope')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.useTemplate(ctx.input.templateId, {
      recipients: ctx.input.recipientOverrides,
      prefillFields: ctx.input.prefillFields
    });

    let envelopeId = String(result.id ?? result.envelopeId ?? '');

    return {
      output: { envelopeId },
      message: `Created document \`${envelopeId}\` from template \`${ctx.input.templateId}\`.`
    };
  })
  .build();
