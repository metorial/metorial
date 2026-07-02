import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let responseSchema = z.object({
  responseId: z.string().describe('Chameleon response ID'),
  surveyId: z.string().optional().describe('Associated microsurvey ID'),
  profileId: z.string().optional().describe('Associated user profile ID'),
  href: z.string().optional().describe('Page URL when survey was displayed'),
  buttonText: z.string().optional().describe('Clicked button text'),
  buttonOrder: z.number().optional().describe('0-indexed button position'),
  inputText: z.string().optional().describe('User text comment'),
  dropdownItems: z.string().optional().describe('Selected dropdown options'),
  finishedAt: z.string().nullable().optional().describe('Survey completion timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  profile: z.record(z.string(), z.unknown()).optional().describe('Expanded user profile')
});

export let listSurveyResponses = SlateTool.create(spec, {
  name: 'List Microsurvey Responses',
  key: 'list_survey_responses',
  description: `Retrieve responses for a specific Chameleon microsurvey. Returns response details including button clicks, text inputs, dropdown selections, and the page URL.
Optionally expand profile and company data for each response.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('Chameleon microsurvey ID to get responses for'),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of responses to return (1-500, default 50)'),
      before: z.string().optional().describe('Pagination cursor for older items'),
      after: z.string().optional().describe('Pagination cursor for newer items'),
      order: z.enum(['created_at', 'updated_at']).optional().describe('Sort order field'),
      expandProfile: z
        .enum(['all', 'min', 'skip'])
        .optional()
        .describe('Level of profile detail'),
      expandCompany: z
        .enum(['all', 'min', 'skip'])
        .optional()
        .describe('Level of company detail')
    })
  )
  .output(
    z.object({
      responses: z.array(responseSchema).describe('Array of microsurvey responses'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    let expand: { profile?: string; company?: string } | undefined;
    if (ctx.input.expandProfile || ctx.input.expandCompany) {
      expand = {};
      if (ctx.input.expandProfile) expand.profile = ctx.input.expandProfile;
      if (ctx.input.expandCompany) expand.company = ctx.input.expandCompany;
    }

    let result = await client.listSurveyResponses(ctx.input.surveyId, {
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after,
      order: ctx.input.order,
      expand
    });

    let responses = (result.responses || []).map((r: Record<string, unknown>) => ({
      responseId: r.id as string,
      surveyId: r.survey_id as string | undefined,
      profileId: r.profile_id as string | undefined,
      href: r.href as string | undefined,
      buttonText: r.button_text as string | undefined,
      buttonOrder: r.button_order as number | undefined,
      inputText: r.input_text as string | undefined,
      dropdownItems: r.dropdown_items as string | undefined,
      finishedAt: r.finished_at as string | null | undefined,
      createdAt: r.created_at as string | undefined,
      updatedAt: r.updated_at as string | undefined,
      profile: r.profile as Record<string, unknown> | undefined
    }));

    return {
      output: { responses, cursor: result.cursor },
      message: `Returned **${responses.length}** responses for microsurvey.`
    };
  })
  .build();
