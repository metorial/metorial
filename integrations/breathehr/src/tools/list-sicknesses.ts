import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSicknesses = SlateTool.create(spec, {
  name: 'List Sicknesses',
  key: 'list_sicknesses',
  description: `Retrieve sickness records from Breathe HR. Filter by employee, department, or date range. Returns sickness details including type, dates, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      employeeId: z.string().optional().describe('Filter by employee ID'),
      departmentId: z.string().optional().describe('Filter by department ID'),
      startDate: z
        .string()
        .optional()
        .describe('Filter sicknesses starting from this date (format: YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter sicknesses ending before this date (format: YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      sicknesses: z.array(z.record(z.string(), z.any())).describe('List of sickness records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listSicknesses({
      employeeId: ctx.input.employeeId,
      departmentId: ctx.input.departmentId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let sicknesses = result?.sicknesses || [];

    return {
      output: { sicknesses },
      message: `Retrieved **${sicknesses.length}** sickness record(s).`
    };
  })
  .build();
