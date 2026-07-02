import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let forecastSchema = z.object({
  forecastId: z.number().describe('Forecast/task ID'),
  projectId: z.number().nullable().describe('Associated project ID'),
  projectName: z.string().nullable().describe('Associated project name'),
  userId: z.number().nullable().describe('Assigned user ID'),
  userName: z.string().nullable().describe('Assigned user name'),
  day: z.string().nullable().describe('Forecast date'),
  from: z.string().nullable().describe('Start date'),
  to: z.string().nullable().describe('End date'),
  note: z.string().nullable().describe('Task notes'),
  durationFormatted: z.string().nullable().describe('Logged duration'),
  estimatedDurationFormatted: z.string().nullable().describe('Estimated duration'),
  labelIds: z.array(z.number()).describe('Label IDs'),
  updatedAt: z.any().nullable().describe('Last updated timestamp')
});

export let listForecasts = SlateTool.create(spec, {
  name: 'List Forecasts',
  key: 'list_forecasts',
  description: `Retrieve forecasts (planned tasks) from Timely. Filter by date range, project, or user. Compare planned vs. actual logged time.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      since: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      upto: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      projectId: z.string().optional().describe('Filter by project ID'),
      userId: z.string().optional().describe('Filter by user ID'),
      limit: z.number().optional().describe('Max forecasts to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      forecasts: z.array(forecastSchema),
      count: z.number().describe('Number of forecasts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let forecasts = await client.listForecasts({
      since: ctx.input.since,
      upto: ctx.input.upto,
      projectId: ctx.input.projectId,
      userId: ctx.input.userId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = forecasts.map((f: any) => ({
      forecastId: f.id,
      projectId: f.project?.id ?? null,
      projectName: f.project?.name ?? null,
      userId: f.user?.id ?? null,
      userName: f.user?.name ?? null,
      day: f.day ?? null,
      from: f.from ?? null,
      to: f.to ?? null,
      note: f.note ?? null,
      durationFormatted: f.duration?.formatted ?? null,
      estimatedDurationFormatted: f.estimated_duration?.formatted ?? null,
      labelIds: f.label_ids ?? [],
      updatedAt: f.updated_at ?? null
    }));

    return {
      output: { forecasts: mapped, count: mapped.length },
      message: `Found **${mapped.length}** forecasts.`
    };
  })
  .build();
