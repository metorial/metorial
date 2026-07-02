import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeverlyClient } from '../lib/client';
import { spec } from '../spec';

export let createCall = SlateTool.create(spec, {
  name: 'Create Call',
  key: 'create_call',

  description: `Submit a lead to Leverly to initiate an automated call sequence to your sales team. Leverly converts the lead data to speech and calls your reps instantly. At minimum, a phone number is required. Additional fields like name, email, and lead source can be included for reporting and CRM sync.`,

  instructions: [
    'A valid phone number is required. Include the country code for best results (e.g., +11234567890).',
    'Use groupId to route the lead to a specific sales group if your account has multiple groups configured.',
    'Use callDelay (in seconds) to schedule the call for a later time instead of immediately.'
  ],

  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phone: z
        .string()
        .describe(
          'Lead phone number (required). Include country code for best results, e.g. +11234567890.'
        ),
      firstName: z.string().optional().describe('Lead first name'),
      lastName: z.string().optional().describe('Lead last name'),
      email: z.string().optional().describe('Lead email address'),
      parameter1: z
        .string()
        .optional()
        .describe('Custom parameter 1 for additional lead data'),
      parameter2: z
        .string()
        .optional()
        .describe('Custom parameter 2 for additional lead data'),
      address: z.string().optional().describe('Lead street address'),
      country: z.string().optional().describe('Lead country'),
      city: z.string().optional().describe('Lead city'),
      state: z.string().optional().describe('Lead state or region'),
      zip: z.string().optional().describe('Lead zip or postal code'),
      leadSource: z
        .string()
        .optional()
        .describe('Source of the lead (e.g., "Facebook Ads", "Website Form")'),
      leadInterest: z.string().optional().describe('What the lead expressed interest in'),
      company: z.string().optional().describe('Lead company name'),
      keywords: z.string().optional().describe('Keywords associated with the lead'),
      comments: z.string().optional().describe('Additional comments or notes about the lead'),
      vendorLeadId: z
        .string()
        .optional()
        .describe('External lead ID from the originating vendor or CRM'),
      callDelay: z
        .number()
        .optional()
        .describe('Delay in seconds before the call is initiated'),
      groupId: z
        .string()
        .optional()
        .describe('Leverly group ID to route the lead to a specific sales group')
    })
  )
  .output(
    z.object({
      submitted: z
        .boolean()
        .describe('Whether the lead was successfully submitted to Leverly'),
      phone: z.string().describe('Phone number of the submitted lead'),
      response: z.string().optional().describe('Raw response from the Leverly API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeverlyClient({
      username: ctx.auth.username,
      token: ctx.auth.token,
      accountId: ctx.auth.accountId
    });

    let response = await client.createCall({
      phone: ctx.input.phone,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      parameter1: ctx.input.parameter1,
      parameter2: ctx.input.parameter2,
      address: ctx.input.address,
      country: ctx.input.country,
      city: ctx.input.city,
      state: ctx.input.state,
      zip: ctx.input.zip,
      leadSource: ctx.input.leadSource,
      leadInterest: ctx.input.leadInterest,
      company: ctx.input.company,
      keywords: ctx.input.keywords,
      comments: ctx.input.comments,
      vendorLeadId: ctx.input.vendorLeadId,
      callDelay: ctx.input.callDelay,
      groupId: ctx.input.groupId
    });

    let responseStr = typeof response === 'string' ? response : JSON.stringify(response);

    let leadName =
      [ctx.input.firstName, ctx.input.lastName].filter(Boolean).join(' ') || 'Unknown';

    return {
      output: {
        submitted: true,
        phone: ctx.input.phone,
        response: responseStr
      },
      message: `Lead **${leadName}** (${ctx.input.phone}) submitted to Leverly. An automated call sequence will be initiated to connect your sales team with this lead.`
    };
  })
  .build();
