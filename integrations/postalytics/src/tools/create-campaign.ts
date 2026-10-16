import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description:
    'Create a direct mail campaign from a proofed template, postage settings, and sender address.',
  instructions: [
    'Create and proof the template before creating the campaign. Use manage_templates to discover template IDs.',
    'CreditTypeId and postageType must match the selected mail format and postage class. Review the provider credit types before creating a campaign.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the campaign'),
      creditTypeId: z
        .number()
        .describe(
          'Postalytics credit type for the mail format and postage class, such as 21 for 4x6 first class or 34 for standard letters'
        ),
      postageType: z.number().describe('Postage class: 0 for first class, 1 for standard'),
      templateFrontId: z
        .number()
        .describe('ID of the proofed template. Discover IDs with manage_templates.'),
      templateEnvelopeId: z
        .number()
        .optional()
        .describe('Custom envelope template ID for a letter campaign'),
      senderName: z.string().describe('Sender name'),
      senderAddress1: z.string().describe('Sender street address'),
      senderAddress2: z.string().optional().describe('Sender secondary street address'),
      senderCity: z.string().describe('Sender city'),
      senderState: z.string().describe('Sender state'),
      senderZip: z.string().describe('Sender postal code'),
      senderCountry: z
        .string()
        .optional()
        .describe('Sender country. Postalytics defaults to US when omitted.')
    })
  )
  .output(
    z.object({
      campaign: z
        .record(z.string(), z.unknown())
        .describe(
          'Full campaign creation response, including the provider drop ID when returned'
        )
    })
  )
  .handleInvocation(async ctx => {
    for (let [key, value] of Object.entries({
      creditTypeId: ctx.input.creditTypeId,
      templateFrontId: ctx.input.templateFrontId,
      templateEnvelopeId: ctx.input.templateEnvelopeId
    })) {
      if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
        throw createApiServiceError(`${key} must be a positive whole number.`);
      }
    }
    if (![0, 1].includes(ctx.input.postageType)) {
      throw createApiServiceError('postageType must be 0 for first class or 1 for standard.');
    }
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });
    let campaign = await client.createCampaign(
      pickDefined({
        DirectMailName: ctx.input.name,
        CreditTypeId: ctx.input.creditTypeId,
        PostageType: ctx.input.postageType,
        TemplateFrontId: ctx.input.templateFrontId,
        TemplateEnvelopeId: ctx.input.templateEnvelopeId,
        SenderName: ctx.input.senderName,
        SenderAddress1: ctx.input.senderAddress1,
        SenderAddress2: ctx.input.senderAddress2,
        SenderCity: ctx.input.senderCity,
        SenderState: ctx.input.senderState,
        SenderZip: ctx.input.senderZip,
        SenderCountry: ctx.input.senderCountry
      })
    );
    return { output: { campaign }, message: 'Created the Postalytics campaign.' };
  })
  .build();
