import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeadForms = SlateTool.create(spec, {
  name: 'List Lead Forms',
  key: 'list_lead_forms',
  description: `List LinkedIn Lead Gen Forms for an ad account. Lead Gen Forms are used to collect lead information directly within LinkedIn ads.`,
  constraints: [
    'Requires the r_marketing_leadgen_automation scope and Lead Sync API approval.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Numeric ID of the ad account'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      leadForms: z.array(
        z.object({
          leadFormId: z.number().describe('Numeric ID of the lead form'),
          name: z.string().describe('Name of the lead form'),
          status: z.string().describe('Form status'),
          headline: z.string().optional().describe('Form headline shown to users'),
          description: z.string().optional().describe('Form description'),
          privacyPolicyUrl: z.string().optional().describe('Privacy policy URL'),
          questions: z
            .array(
              z.object({
                predefinedField: z.string().optional().describe('Predefined field type'),
                customQuestionText: z.string().optional().describe('Custom question text'),
                required: z.boolean().optional().describe('Whether the question is required')
              })
            )
            .optional()
            .describe('Form questions')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLeadForms(ctx.input.accountId, {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let leadForms = result.elements.map(form => ({
      leadFormId: form.id,
      name: form.name,
      status: form.status,
      headline: form.headline,
      description: form.description,
      privacyPolicyUrl: form.privacyPolicyUrl,
      questions: form.questions
    }));

    return {
      output: { leadForms },
      message: `Found **${leadForms.length}** lead form(s).`
    };
  })
  .build();

export let getLeadFormResponses = SlateTool.create(spec, {
  name: 'Get Lead Form Responses',
  key: 'get_lead_form_responses',
  description: `Retrieve submissions/responses for LinkedIn Lead Gen Forms. Can query by lead form ID or ad account. Supports time-based filtering to fetch only recent responses.`,
  constraints: [
    'Requires the r_marketing_leadgen_automation scope and Lead Sync API approval.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      leadFormId: z.string().optional().describe('Numeric ID of a specific lead form'),
      accountId: z
        .string()
        .optional()
        .describe('Numeric ID of the ad account (alternative to leadFormId)'),
      startTime: z
        .number()
        .optional()
        .describe('Filter responses submitted after this epoch timestamp (ms)'),
      endTime: z
        .number()
        .optional()
        .describe('Filter responses submitted before this epoch timestamp (ms)'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      responses: z.array(
        z.object({
          responseId: z.string().describe('ID of the lead form response'),
          leadForm: z.string().describe('Lead form URN'),
          submittedAt: z.number().describe('Submission timestamp in epoch milliseconds'),
          answers: z
            .array(
              z.object({
                questionId: z.string().optional().describe('Question identifier'),
                answer: z.string().optional().describe("User's answer")
              })
            )
            .optional()
            .describe('Submitted answers'),
          associatedEntity: z
            .string()
            .optional()
            .describe('URN of the associated campaign/creative')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLeadFormResponses({
      leadFormId: ctx.input.leadFormId,
      accountId: ctx.input.accountId,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let responses = result.elements.map(response => ({
      responseId: response.id,
      leadForm: response.leadForm,
      submittedAt: response.submittedAt,
      answers: response.formResponse?.answers?.map(a => ({
        questionId: a.questionId,
        answer: a.answerDetails?.textQuestionAnswer?.answer
      })),
      associatedEntity: response.associatedEntity
    }));

    return {
      output: { responses },
      message: `Retrieved **${responses.length}** lead form response(s).`
    };
  })
  .build();
