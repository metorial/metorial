import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, continuation } from '../lib/client';
import { accountIdField } from '../lib/schemas';
import { spec } from '../spec';

export let listLeadForms = SlateTool.create(spec, {
  name: 'List Lead Forms',
  key: 'list_lead_forms',
  description: `List LinkedIn Lead Gen Forms for an ad account. Lead Gen Forms are used to collect lead information directly within LinkedIn ads.`,
  instructions: [
    'Use exactLeadForms for the complete page and exact IDs. The legacy leadForms array contains only safely representable numeric IDs; legacyNumericIdOmissionCount makes any difference explicit.'
  ],
  constraints: [
    'Requires r_ads or rw_ads with Advertising API access, or r_marketing_leadgen_automation with Lead Sync API access, and an authorized ad account role.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(anyOf('r_ads', 'rw_ads', 'r_marketing_leadgen_automation'))
  .input(
    z.object({
      accountId: accountIdField,
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z
        .string()
        .optional()
        .describe('Returned offset token (offset:N); numeric offsets are also accepted')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Continuation token for pageToken with the same filters'),
      legacyNumericIdOmissionCount: z
        .number()
        .optional()
        .describe(
          'Forms whose IDs cannot be represented safely in leadForms; all forms remain available in exactLeadForms'
        ),
      exactLeadForms: z
        .array(
          z.object({
            leadFormId: z
              .string()
              .describe('Exact form ID; pass directly to get_lead_form_responses'),
            versionId: z.number(),
            owner: z.string(),
            name: z.string(),
            status: z.string(),
            headline: z.string().optional(),
            description: z.string().optional(),
            privacyPolicyUrl: z.string().optional(),
            questions: z
              .array(
                z.object({
                  predefinedField: z.string().optional(),
                  customQuestionText: z.string().optional(),
                  required: z.boolean().optional()
                })
              )
              .optional()
          })
        )
        .optional()
        .describe(
          'Complete page of forms with exact string IDs, including IDs beyond the numeric range'
        ),
      leadForms: z.array(
        z.object({
          leadFormId: z
            .number()
            .describe(
              'Legacy numeric ID; only safely representable IDs appear here; use exactLeadForms for the complete page'
            ),
          versionId: z.number().optional(),
          owner: z.string().optional(),
          name: z.string(),
          status: z.string(),
          headline: z.string().optional(),
          description: z.string().optional(),
          privacyPolicyUrl: z.string().optional(),
          questions: z
            .array(
              z.object({
                predefinedField: z.string().optional(),
                customQuestionText: z.string().optional(),
                required: z.boolean().optional()
              })
            )
            .optional()
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

    const exactLeadForms = result.elements.map(form => ({
      leadFormId: form.id,
      versionId: form.versionId,
      owner: form.owner.sponsoredAccount,
      name: form.name,
      status: form.status,
      headline: form.headline,
      description: form.description,
      privacyPolicyUrl: form.privacyPolicyUrl,
      questions: form.questions
    }));

    const leadForms = exactLeadForms
      .filter(form => Number.isSafeInteger(Number(form.leadFormId)))
      .map(form => ({ ...form, leadFormId: Number(form.leadFormId) }));
    const legacyNumericIdOmissionCount = exactLeadForms.length - leadForms.length;
    return {
      output: {
        leadForms,
        exactLeadForms,
        legacyNumericIdOmissionCount,
        nextPageToken: continuation(result, true)
      },
      message: `Found **${exactLeadForms.length}** lead form(s). All exact IDs are in exactLeadForms.${legacyNumericIdOmissionCount ? ` ${legacyNumericIdOmissionCount} form(s) have IDs outside the safe numeric range and appear only in exactLeadForms.` : ''}`
    };
  })
  .build();

export let getLeadFormResponses = SlateTool.create(spec, {
  name: 'Get Lead Form Responses',
  key: 'get_lead_form_responses',
  description: `Retrieve submissions/responses for LinkedIn Lead Gen Forms. Query an account owner, optionally selecting a form and version. Supports time-based filtering to fetch only recent responses.`,
  constraints: [
    'Requires the r_marketing_leadgen_automation scope and Lead Sync API approval.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(anyOf('r_marketing_leadgen_automation'))
  .input(
    z.object({
      leadFormId: z
        .string()
        .optional()
        .describe(
          'Lead form ID or URN. Numeric/unversioned IDs select its current version; a complete versionedLeadGenForm URN selects an explicit version'
        ),
      accountId: accountIdField.optional(),
      limitedToTestLeads: z
        .boolean()
        .optional()
        .describe('Return only provider test leads when true'),
      startTime: z
        .number()
        .optional()
        .describe('Filter responses submitted after this epoch timestamp (ms)'),
      endTime: z
        .number()
        .optional()
        .describe('Filter responses submitted before this epoch timestamp (ms)'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z
        .string()
        .optional()
        .describe('Returned offset token (offset:N); numeric offsets are also accepted')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Offset continuation token for pageToken with the same filters'),
      responses: z.array(
        z.object({
          responseId: z.string().describe('ID of the lead form response'),
          versionedLeadGenFormUrn: z.string().optional(),
          testLead: z.boolean().optional(),
          leadForm: z.string().describe('Lead form URN'),
          submittedAt: z.number().describe('Submission timestamp in epoch milliseconds'),
          answers: z
            .array(
              z.object({
                questionId: z.string().optional().describe('Question identifier'),
                answer: z.string().optional().describe("User's text answer"),
                options: z
                  .array(z.number())
                  .optional()
                  .describe('Selected option IDs for a multiple-choice answer')
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
      limitedToTestLeads: ctx.input.limitedToTestLeads,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let responses = result.elements.map(response => ({
      responseId: response.id,
      versionedLeadGenFormUrn: response.versionedLeadGenFormUrn,
      testLead: response.testLead,
      leadForm: response.leadForm,
      submittedAt: response.submittedAt,
      answers: response.formResponse?.answers?.map(a => ({
        questionId: a.questionId,
        answer: a.answer,
        options: a.options
      })),
      associatedEntity: response.associatedEntity
    }));

    return {
      output: { responses, nextPageToken: continuation(result, true) },
      message: `Retrieved **${responses.length}** lead form response(s).`
    };
  })
  .build();
