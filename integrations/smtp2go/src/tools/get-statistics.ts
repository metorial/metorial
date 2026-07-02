import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmailStatistics = SlateTool.create(spec, {
  name: 'Get Email Statistics',
  key: 'get_email_statistics',
  description: `Retrieve a combined email statistics summary including bounce rates, spam complaints, unsubscribes, and delivery cycle data. Optionally filter by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Start date in ISO-8601 format'),
      endDate: z.string().optional().describe('End date in ISO-8601 format')
    })
  )
  .output(
    z.object({
      summary: z
        .any()
        .describe(
          'Combined email statistics summary including bounces, spam, unsubscribes, and cycle data'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getEmailSummary({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });
    let data = result.data || result;

    return {
      output: {
        summary: data
      },
      message: `Email statistics summary retrieved${ctx.input.startDate ? ` from ${ctx.input.startDate}` : ''}${ctx.input.endDate ? ` to ${ctx.input.endDate}` : ''}.`
    };
  })
  .build();

export let getEmailBounces = SlateTool.create(spec, {
  name: 'Get Bounce Report',
  key: 'get_email_bounces',
  description: `Retrieve email bounce statistics. Returns hard and soft bounce data, optionally filtered by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Start date in ISO-8601 format'),
      endDate: z.string().optional().describe('End date in ISO-8601 format')
    })
  )
  .output(
    z.object({
      bounces: z.any().describe('Bounce statistics data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getEmailBounces({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });
    let data = result.data || result;

    return {
      output: {
        bounces: data
      },
      message: `Bounce report retrieved.`
    };
  })
  .build();

export let getEmailHistory = SlateTool.create(spec, {
  name: 'Get Email History',
  key: 'get_email_history',
  description: `Retrieve email sending history showing volume over time, optionally filtered by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Start date in ISO-8601 format'),
      endDate: z.string().optional().describe('End date in ISO-8601 format')
    })
  )
  .output(
    z.object({
      history: z.any().describe('Email history data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getEmailHistory({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });
    let data = result.data || result;

    return {
      output: {
        history: data
      },
      message: `Email sending history retrieved.`
    };
  })
  .build();
