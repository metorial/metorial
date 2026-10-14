import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific template including its roles, form fields, sender details, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().optional().describe('Template ID'),
      templateName: z.string().optional().describe('Template name'),
      templateDescription: z.string().optional().describe('Template description'),
      status: z.string().optional().describe('Template status'),
      senderDetail: z.record(z.string(), z.any()).optional().describe('Sender information'),
      signerDetails: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Role/signer configuration; each role index is the roleIndex used by send_from_template'
        ),
      ccDetails: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('CC recipient details'),
      brandId: z.string().optional().describe('Associated brand ID'),
      labels: z.array(z.string()).optional().describe('Template tags/labels'),
      createdDate: z.number().optional().describe('Creation timestamp'),
      sharedTemplateDetail: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Teams the template is shared with')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      region: ctx.config.region
    });

    let result = await client.getTemplate(ctx.input.templateId);

    let output = {
      templateId: result.templateId ?? ctx.input.templateId,
      templateName: result.title ?? result.templateName ?? undefined,
      templateDescription: result.description ?? result.templateDescription ?? undefined,
      status: result.status ?? undefined,
      senderDetail: result.createdBy ?? result.senderDetail ?? undefined,
      signerDetails: result.roles ?? result.signerDetails ?? undefined,
      ccDetails: result.cCDetails ?? result.ccDetails ?? undefined,
      brandId: result.brandId ?? undefined,
      labels: result.labels ?? undefined,
      createdDate: result.createdDate ?? undefined,
      sharedTemplateDetail: result.sharedTemplateDetail ?? undefined
    };

    return {
      output,
      message: `Template **${output.templateName ?? output.templateId}**${output.status ? ` — Status: **${output.status}**` : ''}`
    };
  })
  .build();
