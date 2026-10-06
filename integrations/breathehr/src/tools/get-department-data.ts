import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail, pageParams, paginationSchema, readRows, requireId } from '../lib/response';
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
      pagination: paginationSchema.optional(),
      records: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of department data records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    if (ctx.input.dataType !== 'absences' && ctx.input.excludeCancelledAbsences !== undefined)
      fail(
        'excludeCancelledAbsences applies only to department absences. Omit it for this dataType.'
      );
    const result = await client.department(
      ctx.input.dataType,
      requireId(ctx.input.departmentId, 'departmentId'),
      {
        ...pageParams(ctx.input),
        ...(ctx.input.dataType === 'absences'
          ? { exclude_cancelled_absences: ctx.input.excludeCancelledAbsences }
          : {})
      }
    );
    const records = readRows(result, ctx.input.dataType);
    return {
      output: { records, pagination: result.pagination },
      message: `Retrieved **${records.length}** record(s).`
    };
  })
  .build();
