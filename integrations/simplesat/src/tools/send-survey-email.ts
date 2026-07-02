import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSurveyEmail = SlateTool.create(spec, {
  name: 'Send Survey Email',
  key: 'send_survey_email',
  description: `Send an event-based survey email to a customer. Triggers a survey email from Simplesat, useful for collecting feedback after key moments such as purchases, support resolutions, or onboarding completion. You can include customer details, ticket info, and team member data. Simplesat's email suppression feature automatically prevents sending too many surveys to the same customer.`,
  instructions: [
    'The survey token can be found in the survey delivery settings in Simplesat.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      surveyToken: z.string().describe('The survey token identifying which survey to send'),
      customerEmail: z.string().describe('Email address of the customer to survey'),
      customerName: z.string().optional().describe('Customer name'),
      customerCompany: z.string().optional().describe('Customer company name'),
      customerCustomAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom customer attributes'),
      teamMemberId: z
        .string()
        .optional()
        .describe('ID of the team member associated with this interaction'),
      teamMemberEmail: z.string().optional().describe('Email of the team member'),
      teamMemberName: z.string().optional().describe('Name of the team member'),
      ticketId: z.string().optional().describe('Associated ticket or case ID'),
      ticketSubject: z.string().optional().describe('Subject of the associated ticket'),
      ticketCustomAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom ticket attributes')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.unknown())
        .describe('API response from sending the survey email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let teamMember =
      ctx.input.teamMemberId || ctx.input.teamMemberEmail || ctx.input.teamMemberName
        ? {
            teamMemberId: ctx.input.teamMemberId,
            email: ctx.input.teamMemberEmail,
            name: ctx.input.teamMemberName
          }
        : undefined;

    let ticket =
      ctx.input.ticketId || ctx.input.ticketSubject || ctx.input.ticketCustomAttributes
        ? {
            ticketId: ctx.input.ticketId,
            subject: ctx.input.ticketSubject,
            customAttributes: ctx.input.ticketCustomAttributes
          }
        : undefined;

    let result = await client.sendSurveyEmail({
      surveyToken: ctx.input.surveyToken,
      customer: {
        email: ctx.input.customerEmail,
        name: ctx.input.customerName,
        company: ctx.input.customerCompany,
        customAttributes: ctx.input.customerCustomAttributes
      },
      teamMember,
      ticket
    });

    return {
      output: {
        result
      },
      message: `Survey email sent to **${ctx.input.customerEmail}**.`
    };
  })
  .build();
