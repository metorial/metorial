import { z } from 'zod';
import { collection, pageOutput, pageParams, single } from '../lib/client';
import { remoteTool } from '../lib/tool';
import {
  fail,
  id,
  pageSchema,
  pageSizeSchema,
  paginationOutput,
  recordSchema,
  rejectFields
} from '../lib/validation';
export let manageTimesheets = remoteTool(
  {
    name: 'Manage Timesheets',
    key: 'manage_timesheets',
    description:
      'List and read timesheets or approve a submitted timesheet for payroll. Approval may have payroll effects and does not prove payroll completion.',
    tags: { destructive: true }
  },
  z.object({
    action: z.enum(['list', 'get', 'approve']),
    timesheetId: z.string().optional(),
    employmentId: z
      .string()
      .optional()
      .describe('Legacy list filter; not documented by the current timesheet endpoint.'),
    status: z.string().optional(),
    page: pageSchema,
    pageSize: pageSizeSchema
  }),
  z.object({
    timesheet: recordSchema.optional(),
    timesheets: z.array(recordSchema).optional(),
    ...paginationOutput
  }),
  async (client, input) => {
    if (input.action === 'list') {
      rejectFields(
        input,
        ['employmentId'],
        'The current timesheet list does not document employmentId filtering. Omit it and inspect employment_id on the returned page.'
      );
      let value = await client.get('/timesheets', {
        ...pageParams(input),
        status: input.status
      });
      return {
        output: { timesheets: collection(value, 'timesheets'), ...pageOutput(value) },
        message: 'Retrieved a timesheet page.'
      };
    }
    let timesheetId = id(input.timesheetId, 'Timesheet ID');
    let current = await client.entity('/timesheets', 'timesheet', timesheetId);
    if (input.action === 'get')
      return { output: { timesheet: current }, message: 'Retrieved the current timesheet.' };
    if (current.status !== 'submitted')
      fail(
        'Timesheet approval requires submitted status. Read its current state before retrying.'
      );
    let timesheet = single(
      await client.post(`/timesheets/${timesheetId}/approve`),
      'timesheet',
      timesheetId
    );
    return {
      output: { timesheet },
      message:
        'Remote accepted timesheet approval for payroll. Payroll processing is not confirmed.'
    };
  }
);
