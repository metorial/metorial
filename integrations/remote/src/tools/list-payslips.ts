import { z } from 'zod';
import { collection, pageOutput, pageParams } from '../lib/client';
import { remoteTool } from '../lib/tool';
import {
  date,
  fail,
  id,
  pageSchema,
  pageSizeSchema,
  paginationOutput,
  recordSchema
} from '../lib/validation';
export let listPayslips = remoteTool(
  {
    name: 'List Payslips',
    key: 'list_payslips',
    description:
      'List accessible payslips by employment and documented issue-date or expected-payout-date ranges. Use download_payslip for a PDF.',
    tags: { readOnly: true }
  },
  z.object({
    employmentId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: pageSchema,
    pageSize: pageSizeSchema,
    expectedPayoutStartDate: z.string().optional(),
    expectedPayoutEndDate: z.string().optional()
  }),
  z.object({ payslips: z.array(recordSchema), ...paginationOutput }),
  async (client, input) => {
    for (let [a, b] of [
      [input.startDate, input.endDate],
      [input.expectedPayoutStartDate, input.expectedPayoutEndDate]
    ]) {
      if (a) date(a, 'Start date');
      if (b) date(b, 'End date');
      if (a && b && a > b) fail('Start date must be before or equal to end date.');
    }
    let value = await client.get('/payslips', {
      ...pageParams(input),
      employment_id: input.employmentId === undefined ? undefined : id(input.employmentId),
      start_date: input.startDate,
      end_date: input.endDate,
      expected_payout_start_date: input.expectedPayoutStartDate,
      expected_payout_end_date: input.expectedPayoutEndDate
    });
    return {
      output: { payslips: collection(value, 'payslips'), ...pageOutput(value) },
      message: 'Retrieved a payslip page.'
    };
  }
);
