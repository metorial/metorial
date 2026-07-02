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
        .describe('Role/signer configuration'),
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
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: result.templateId,
        templateName: result.templateName,
        templateDescription: result.templateDescription,
        status: result.status,
        senderDetail: result.senderDetail,
        signerDetails: result.signerDetails,
        ccDetails: result.ccDetails,
        brandId: result.brandId,
        labels: result.labels,
        createdDate: result.createdDate,
        sharedTemplateDetail: result.sharedTemplateDetail
      },
      message: `Template **${result.templateName ?? result.templateId}** — Status: **${result.status}**`
    };
  })
  .build();
