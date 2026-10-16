import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Submit a new lead into PageXCRM from an external source. Use this to capture leads from websites, ad platforms, or other applications and feed them into your CRM for sales tracking and management.`,
  constraints: [
    'Submits a lead through the published lead-ingestion endpoint. Manage existing leads in PageXCRM.',
    'Requires both a PageXCRM API key and a RapidAPI subscription key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z
        .string()
        .optional()
        .describe(
          'Optional external customer identifier for the lead. Overrides the default from configuration if provided.'
        ),
      name: z.string().describe('Full name of the lead'),
      email: z.string().describe('Email address of the lead'),
      phone: z.string().optional().describe('Phone number of the lead'),
      platform: z
        .string()
        .optional()
        .describe('Source platform the lead originated from (e.g. website name, ad platform)'),
      country: z
        .string()
        .optional()
        .describe('Country of the lead, sent as the custom detail more.country'),
      more: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Additional custom lead details, such as company or source. The country input also sets more.country.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the lead was successfully submitted'),
      rawResponse: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Raw response data from the PageXCRM API')
    })
  )
  .handleInvocation(async ctx => {
    let customerId = ctx.input.customerId ?? ctx.config.customerId;

    let client = new Client({
      token: ctx.auth.token,
      rapidApiToken: ctx.auth.rapidApiToken
    });

    ctx.info('Submitting lead to PageXCRM...');

    let response = await client.createLead({
      customerId,
      name: ctx.input.name,
      email: ctx.input.email,
      phone: ctx.input.phone,
      platform: ctx.input.platform,
      country: ctx.input.country,
      more: ctx.input.more
    });

    ctx.info('Lead submitted successfully.');

    return {
      output: {
        success: true,
        rawResponse: response
      },
      message: 'PageXCRM confirmed that the lead was successfully submitted.'
    };
  })
  .build();
