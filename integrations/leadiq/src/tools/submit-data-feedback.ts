import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitDataFeedback = SlateTool.create(spec, {
  name: 'Submit Data Feedback',
  key: 'submit_data_feedback',
  description: `Submit corrections for person contact data in LeadIQ. Report an email or phone number as correct or invalid, including specific reasons for invalidity.
Use this to improve data quality by reporting bounced emails, wrong numbers, or confirming accurate contact information.`,
  instructions: [
    'Provide enough identifying information (personId, linkedinUrl, or name + company) to locate the person record.',
    'The "value" field should contain the email or phone number being corrected.',
    'Set status to "Correct" to confirm data, or "Invalid" to report bad data.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.string().optional().describe('LeadIQ person ID'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the person'),
      linkedinId: z.string().optional().describe('LinkedIn profile ID of the person'),
      name: z.string().optional().describe('Full name of the person'),
      companyId: z.string().optional().describe('LeadIQ company ID'),
      companyName: z.string().optional().describe('Company name'),
      companyDomain: z.string().optional().describe('Company domain'),
      title: z.string().optional().describe('Job title of the person'),
      value: z.string().describe('The email address or phone number being corrected'),
      status: z
        .enum(['Correct', 'Invalid'])
        .describe('Whether the contact info is correct or invalid'),
      invalidReason: z
        .enum([
          'EmailBounceCode511',
          'EmailBounceCode513',
          'EmailBounceCode550',
          'EmailBounceCode551',
          'EmailBounceCode552',
          'EmailBounceCode553',
          'WrongPerson',
          'Other'
        ])
        .optional()
        .describe('Reason for marking as invalid (required when status is Invalid)'),
      type: z
        .enum([
          'PersonalMobile',
          'PersonalLandline',
          'WorkHQ',
          'WorkPhone',
          'WorkEmail',
          'PersonalPhone',
          'WorkBranch',
          'PersonalEmail',
          'WorkMobile',
          'Fax'
        ])
        .describe('Type of contact information being corrected')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the feedback was submitted successfully'),
      feedbackResult: z.any().optional().describe('Feedback submission result from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, any> = {
      value: ctx.input.value,
      status: ctx.input.status,
      type: ctx.input.type
    };

    if (ctx.input.personId) input.personId = ctx.input.personId;
    if (ctx.input.linkedinUrl) input.linkedinUrl = ctx.input.linkedinUrl;
    if (ctx.input.linkedinId) input.linkedinId = ctx.input.linkedinId;
    if (ctx.input.name) input.name = ctx.input.name;
    if (ctx.input.companyId) input.companyId = ctx.input.companyId;
    if (ctx.input.companyName) input.companyName = ctx.input.companyName;
    if (ctx.input.companyDomain) input.companyDomain = ctx.input.companyDomain;
    if (ctx.input.title) input.title = ctx.input.title;
    if (ctx.input.invalidReason) input.invalidReason = ctx.input.invalidReason;

    let result = await client.submitPersonFeedback(input);

    return {
      output: {
        success: true,
        feedbackResult: result
      },
      message: `Data feedback submitted: **${ctx.input.value}** marked as **${ctx.input.status}** (${ctx.input.type}).`
    };
  })
  .build();
