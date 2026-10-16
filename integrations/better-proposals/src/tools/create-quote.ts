import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createQuote = SlateTool.create(spec, {
  name: 'Create Quote',
  key: 'create_quote',
  description:
    'Creates a quote for a client company, optionally using amounts from a template. Call list_companies and list_templates to discover IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      companyId: z
        .string()
        .describe('Client company ID. Call list_companies to discover IDs.'),
      templateId: z
        .string()
        .optional()
        .describe(
          'Template ID to obtain quote amounts from. Call list_templates to discover IDs.'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      quote: z.any().describe('Created quote data')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).createQuote(
      ctx.input.companyId,
      ctx.input.templateId
    );
    return {
      output: { status: result.status, quote: result.data },
      message: 'Created quote.'
    };
  })
  .build();
