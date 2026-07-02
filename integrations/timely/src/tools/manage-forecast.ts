import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let manageForecast = SlateTool.create(spec, {
  name: 'Manage Forecast',
  key: 'manage_forecast',
  description: `Create or update a forecast (planned task) in Timely. Provide a **forecastId** to update, or omit it to create a new one. Forecasts help plan upcoming work with estimated times and assigned users.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      forecastId: z
        .string()
        .optional()
        .describe('Forecast ID to update. Omit to create a new forecast'),
      projectId: z.string().describe('Project ID (required for creation)'),
      userId: z.string().optional().describe('User ID to assign the forecast to'),
      hours: z.number().optional().describe('Logged hours'),
      minutes: z.number().optional().describe('Logged minutes'),
      estimatedHours: z.number().optional().describe('Estimated hours'),
      estimatedMinutes: z.number().optional().describe('Estimated minutes'),
      day: z.string().optional().describe('Date (YYYY-MM-DD)'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      note: z.string().optional().describe('Task notes'),
      labelIds: z.array(z.number()).optional().describe('Label IDs to attach')
    })
  )
  .output(
    z.object({
      forecastId: z.number().describe('Forecast ID'),
      projectName: z.string().nullable().describe('Project name'),
      userName: z.string().nullable().describe('Assigned user name'),
      day: z.string().nullable().describe('Date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let result: any;
    let action: string;

    if (ctx.input.forecastId) {
      result = await client.updateForecast(ctx.input.forecastId, {
        projectId: ctx.input.projectId,
        userId: ctx.input.userId,
        hours: ctx.input.hours,
        minutes: ctx.input.minutes,
        estimatedHours: ctx.input.estimatedHours,
        estimatedMinutes: ctx.input.estimatedMinutes,
        day: ctx.input.day,
        from: ctx.input.from,
        to: ctx.input.to,
        note: ctx.input.note,
        labelIds: ctx.input.labelIds
      });
      action = 'Updated';
    } else {
      result = await client.createForecast({
        projectId: ctx.input.projectId,
        userId: ctx.input.userId,
        hours: ctx.input.hours,
        minutes: ctx.input.minutes,
        estimatedHours: ctx.input.estimatedHours,
        estimatedMinutes: ctx.input.estimatedMinutes,
        day: ctx.input.day,
        from: ctx.input.from,
        to: ctx.input.to,
        note: ctx.input.note,
        labelIds: ctx.input.labelIds
      });
      action = 'Created';
    }

    return {
      output: {
        forecastId: result.id,
        projectName: result.project?.name ?? null,
        userName: result.user?.name ?? null,
        day: result.day ?? null
      },
      message: `${action} forecast **#${result.id}**${result.project?.name ? ` on project **${result.project.name}**` : ''}.`
    };
  })
  .build();
