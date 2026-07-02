import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDepartmentData = SlateTool.create(spec, {
  name: 'Get Department Data',
  key: 'get_department_data',
  description: `Retrieve detailed data for a specific department in Breathe HR. Fetch absences, benefits, bonuses, leave requests, or salaries for a given department.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      departmentId: z.string().describe('The ID of the department'),
      dataType: z
        .enum(['absences', 'benefits', 'bonuses', 'leave_requests', 'salaries'])
        .describe('The type of department data to retrieve'),
      excludeCancelledAbsences: z
        .boolean()
        .optional()
        .describe('Exclude cancelled absences (only applies to absences dataType)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('List of department data records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let pagination = { page: ctx.input.page, perPage: ctx.input.perPage };
    let result: any;

    switch (ctx.input.dataType) {
      case 'absences':
        result = await client.getDepartmentAbsences(ctx.input.departmentId, {
          ...pagination,
          excludeCancelledAbsences: ctx.input.excludeCancelledAbsences
        });
        break;
      case 'benefits':
        result = await client.getDepartmentBenefits(ctx.input.departmentId, pagination);
        break;
      case 'bonuses':
        result = await client.getDepartmentBonuses(ctx.input.departmentId, pagination);
        break;
      case 'leave_requests':
        result = await client.getDepartmentLeaveRequests(ctx.input.departmentId, pagination);
        break;
      case 'salaries':
        result = await client.getDepartmentSalaries(ctx.input.departmentId, pagination);
        break;
    }

    let records = result?.[ctx.input.dataType] || [];

    return {
      output: { records },
      message: `Retrieved **${records.length}** ${ctx.input.dataType.replace('_', ' ')} record(s) for department **${ctx.input.departmentId}**.`
    };
  })
  .build();
