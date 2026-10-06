import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  jobs: z
    .array(
      z.object({
        jobId: z.string().describe('UUID of the job'),
        version: z.string().nullable().optional(),
        title: z.string().nullable().optional().describe('Job title'),
        hireDate: z.string().nullable().optional().describe('Hire date'),
        currentCompensationRate: z
          .string()
          .nullable()
          .optional()
          .describe('Current compensation rate'),
        currentPaymentUnit: z.string().nullable().optional().describe('Current payment unit')
      })
    )
    .optional()
    .describe('List of jobs'),
  job: z
    .object({
      jobId: z.string().describe('UUID of the job'),
      title: z.string().nullable().optional().describe('Job title'),
      version: z.string().nullable().optional().describe('Resource version')
    })
    .optional()
    .describe('Created or updated job'),
  compensations: z
    .array(
      z.object({
        compensationId: z.string().describe('UUID of the compensation'),
        employeeId: z.string().nullable().optional(),
        jobId: z.string().nullable().optional(),
        rate: z.string().nullable().optional().describe('Rate'),
        paymentUnit: z.string().nullable().optional().describe('Payment unit'),
        flsaStatus: z.string().nullable().optional().describe('FLSA status'),
        effectiveDate: z.string().nullable().optional().describe('Effective date')
      })
    )
    .optional()
    .describe('List of compensations'),
  compensation: z
    .object({
      compensationId: z.string().describe('UUID of the compensation'),
      rate: z.string().nullable().optional().describe('Rate'),
      paymentUnit: z.string().nullable().optional().describe('Payment unit'),
      flsaStatus: z.string().nullable().optional().describe('FLSA status'),
      effectiveDate: z.string().nullable().optional().describe('Effective date'),
      version: z.string().nullable().optional().describe('Resource version')
    })
    .optional()
    .describe('Created or updated compensation')
});

export let manageJobCompensation = SlateTool.create(spec, {
  name: 'Manage Job & Compensation',
  key: 'manage_job_compensation',
  description: `Manage employee jobs and compensations. Job list/create/update endpoints require an approved Embedded Payroll application. List jobs for an employee, create/update jobs, and manage compensation details (rate, payment unit, FLSA status). Jobs represent positions held by an employee, and each job can have multiple compensations with effective dating.`,
  instructions: [
    'Each employee can have multiple jobs. Each job has one or more compensations.',
    'Compensations support effective dating — the effective_date determines when a rate change takes effect.'
  ]
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for lists, starting at 1.'),
      per: z.number().optional().describe('Results per list page, 1 to 100.'),
      action: z
        .enum([
          'list_jobs',
          'create_job',
          'update_job',
          'list_compensations',
          'create_compensation',
          'update_compensation'
        ])
        .describe('The action to perform'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee UUID (required for list_jobs/create_job)'),
      jobId: z
        .string()
        .optional()
        .describe('Job UUID (required for update_job/list_compensations/create_compensation)'),
      compensationId: z
        .string()
        .optional()
        .describe('Compensation UUID (required for update_compensation)'),
      version: z.string().optional().describe('Resource version for optimistic locking'),
      title: z.string().optional().describe('Job title'),
      hireDate: z.string().optional().describe('Hire date (YYYY-MM-DD)'),
      rate: z.string().optional().describe('Compensation rate (e.g., "50000.00")'),
      paymentUnit: z
        .string()
        .optional()
        .describe('Payment unit (Hour, Week, Month, Year, Paycheck)'),
      flsaStatus: z
        .string()
        .optional()
        .describe('FLSA status (Exempt, Salaried Nonexempt, Nonexempt, Owner)'),
      effectiveDate: z
        .string()
        .optional()
        .describe('Effective date for the compensation change (YYYY-MM-DD)')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx =>
    invokeGusto('manage_job_compensation', ctx.input, ctx.auth, outputSchema)
  )
  .build();
