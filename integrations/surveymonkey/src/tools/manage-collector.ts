import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCollector = SlateTool.create(spec, {
  name: 'Create Collector',
  key: 'create_collector',
  description: `Create a new collector for a survey to start gathering responses. Collectors can be weblinks, email invitations, SMS, or popup surveys. Configure settings like close date, redirect URL, anonymity, and response limits.`,
  instructions: [
    'Creating non-weblink collectors (email, SMS, popup) requires a paid SurveyMonkey plan.'
  ]
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey to create a collector for'),
      type: z
        .enum([
          'weblink',
          'email',
          'sms',
          'popup_invitation',
          'popup_survey',
          'embedded_survey'
        ])
        .describe('Type of collector'),
      name: z.string().optional().describe('Name for the collector'),
      thankYouMessage: z
        .string()
        .optional()
        .describe('Custom thank-you message shown after completion'),
      closeDate: z
        .string()
        .optional()
        .describe('Date to close the collector (YYYY-MM-DDTHH:MM:SS)'),
      redirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect respondents after survey completion'),
      allowMultipleResponses: z
        .boolean()
        .optional()
        .describe('Whether to allow multiple responses from same respondent'),
      anonymousType: z
        .enum(['not_anonymous', 'partially_anonymous', 'fully_anonymous'])
        .optional()
        .describe('Level of response anonymity'),
      password: z.string().optional().describe('Password required to access the survey'),
      responseLimit: z.number().optional().describe('Maximum number of responses to collect'),
      senderEmail: z.string().optional().describe('Sender email for email collectors')
    })
  )
  .output(
    z.object({
      collectorId: z.string(),
      type: z.string(),
      name: z.string().optional(),
      status: z.string().optional(),
      surveyUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let collector = await client.createCollector(ctx.input.surveyId, {
      type: ctx.input.type,
      name: ctx.input.name,
      thankYouMessage: ctx.input.thankYouMessage,
      closeDate: ctx.input.closeDate,
      redirectUrl: ctx.input.redirectUrl,
      allowMultipleResponses: ctx.input.allowMultipleResponses,
      anonymous: ctx.input.anonymousType,
      password: ctx.input.password,
      responseLimit: ctx.input.responseLimit,
      senderEmail: ctx.input.senderEmail
    });

    return {
      output: {
        collectorId: collector.id,
        type: collector.type,
        name: collector.name,
        status: collector.status,
        surveyUrl: collector.url
      },
      message: `Created **${collector.type}** collector \`${collector.id}\`${collector.url ? ` — URL: ${collector.url}` : ''}.`
    };
  })
  .build();

export let updateCollector = SlateTool.create(spec, {
  name: 'Update Collector',
  key: 'update_collector',
  description: `Update an existing collector's settings. You can change name, close date, redirect URL, response limits, status (open/closed), and anonymity settings.`
})
  .input(
    z.object({
      collectorId: z.string().describe('ID of the collector to update'),
      name: z.string().optional().describe('New collector name'),
      thankYouMessage: z.string().optional().describe('Updated thank-you message'),
      closeDate: z.string().optional().describe('New close date (YYYY-MM-DDTHH:MM:SS)'),
      redirectUrl: z.string().optional().describe('New redirect URL'),
      allowMultipleResponses: z.boolean().optional().describe('Allow multiple responses'),
      anonymousType: z
        .enum(['not_anonymous', 'partially_anonymous', 'fully_anonymous'])
        .optional()
        .describe('Anonymity level'),
      password: z.string().optional().describe('Survey access password'),
      responseLimit: z.number().optional().describe('Max responses'),
      status: z.enum(['open', 'closed']).optional().describe('Open or close the collector')
    })
  )
  .output(
    z.object({
      collectorId: z.string(),
      type: z.string(),
      name: z.string().optional(),
      status: z.string().optional(),
      surveyUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let collector = await client.updateCollector(ctx.input.collectorId, {
      name: ctx.input.name,
      thankYouMessage: ctx.input.thankYouMessage,
      closeDate: ctx.input.closeDate,
      redirectUrl: ctx.input.redirectUrl,
      allowMultipleResponses: ctx.input.allowMultipleResponses,
      anonymous: ctx.input.anonymousType,
      password: ctx.input.password,
      responseLimit: ctx.input.responseLimit,
      status: ctx.input.status
    });

    return {
      output: {
        collectorId: collector.id,
        type: collector.type,
        name: collector.name,
        status: collector.status,
        surveyUrl: collector.url
      },
      message: `Updated collector \`${collector.id}\` — status: **${collector.status}**.`
    };
  })
  .build();

export let listCollectors = SlateTool.create(spec, {
  name: 'List Collectors',
  key: 'list_collectors',
  description: `List all collectors for a survey, with optional sorting and pagination. Returns collector IDs, types, and status information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page'),
      sortBy: z
        .enum(['id', 'date_modified', 'type', 'status', 'name'])
        .optional()
        .describe('Sort field'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      collectors: z.array(
        z.object({
          collectorId: z.string(),
          name: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          responseCount: z.number().optional(),
          url: z.string().optional(),
          dateModified: z.string().optional()
        })
      ),
      page: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let result = await client.listCollectors(ctx.input.surveyId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      include: 'type,status,response_count,date_modified,url'
    });

    let collectors = (result.data || []).map((c: any) => ({
      collectorId: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      responseCount: c.response_count,
      url: c.url,
      dateModified: c.date_modified
    }));

    return {
      output: {
        collectors,
        page: result.page || 1,
        total: result.total || collectors.length
      },
      message: `Found **${result.total || collectors.length}** collectors for the survey.`
    };
  })
  .build();

export let deleteCollector = SlateTool.create(spec, {
  name: 'Delete Collector',
  key: 'delete_collector',
  description: `Permanently delete a collector and all its associated responses.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      collectorId: z.string().describe('ID of the collector to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    await client.deleteCollector(ctx.input.collectorId);

    return {
      output: { deleted: true },
      message: `Deleted collector \`${ctx.input.collectorId}\`.`
    };
  })
  .build();
