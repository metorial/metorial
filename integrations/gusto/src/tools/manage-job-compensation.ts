import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageJobCompensation = SlateTool.create(spec, {
  name: 'Manage Job & Compensation',
  key: 'manage_job_compensation',
  description: `Manage employee jobs and compensations. List jobs for an employee, create/update jobs, and manage compensation details (rate, payment unit, FLSA status). Jobs represent positions held by an employee, and each job can have multiple compensations with effective dating.`,
  instructions: [
    'Each employee can have multiple jobs. Each job has one or more compensations.',
    'Compensations support effective dating — the effective_date determines when a rate change takes effect.'
  ]
})
  .input(
    z.object({
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
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('UUID of the job'),
            title: z.string().optional().describe('Job title'),
            hireDate: z.string().optional().describe('Hire date'),
            currentCompensationRate: z
              .string()
              .optional()
              .describe('Current compensation rate'),
            currentPaymentUnit: z.string().optional().describe('Current payment unit')
          })
        )
        .optional()
        .describe('List of jobs'),
      job: z
        .object({
          jobId: z.string().describe('UUID of the job'),
          title: z.string().optional().describe('Job title'),
          version: z.string().optional().describe('Resource version')
        })
        .optional()
        .describe('Created or updated job'),
      compensations: z
        .array(
          z.object({
            compensationId: z.string().describe('UUID of the compensation'),
            rate: z.string().optional().describe('Rate'),
            paymentUnit: z.string().optional().describe('Payment unit'),
            flsaStatus: z.string().optional().describe('FLSA status'),
            effectiveDate: z.string().optional().describe('Effective date')
          })
        )
        .optional()
        .describe('List of compensations'),
      compensation: z
        .object({
          compensationId: z.string().describe('UUID of the compensation'),
          rate: z.string().optional().describe('Rate'),
          paymentUnit: z.string().optional().describe('Payment unit'),
          flsaStatus: z.string().optional().describe('FLSA status'),
          effectiveDate: z.string().optional().describe('Effective date'),
          version: z.string().optional().describe('Resource version')
        })
        .optional()
        .describe('Created or updated compensation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.action) {
      case 'list_jobs': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required');
        let result = await client.listEmployeeJobs(ctx.input.employeeId);
        let jobs = Array.isArray(result) ? result : result.jobs || result;
        let mapped = jobs.map((j: any) => ({
          jobId: j.uuid || j.id?.toString(),
          title: j.title,
          hireDate: j.hire_date,
          currentCompensationRate: j.current_compensation?.rate,
          currentPaymentUnit: j.current_compensation?.payment_unit
        }));
        return {
          output: { jobs: mapped },
          message: `Found **${mapped.length}** job(s) for employee ${ctx.input.employeeId}.`
        };
      }
      case 'create_job': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required');
        let result = await client.createEmployeeJob(ctx.input.employeeId, {
          title: ctx.input.title,
          hire_date: ctx.input.hireDate
        });
        return {
          output: {
            job: {
              jobId: result.uuid || result.id?.toString(),
              title: result.title,
              version: result.version
            }
          },
          message: `Created job **${ctx.input.title}** for employee ${ctx.input.employeeId}.`
        };
      }
      case 'update_job': {
        if (!ctx.input.jobId) throw new Error('jobId is required');
        let data: Record<string, any> = {};
        if (ctx.input.version) data.version = ctx.input.version;
        if (ctx.input.title) data.title = ctx.input.title;
        if (ctx.input.hireDate) data.hire_date = ctx.input.hireDate;
        let result = await client.updateJob(ctx.input.jobId, data);
        return {
          output: {
            job: {
              jobId: result.uuid || result.id?.toString(),
              title: result.title,
              version: result.version
            }
          },
          message: `Updated job ${ctx.input.jobId}.`
        };
      }
      case 'list_compensations': {
        if (!ctx.input.jobId) throw new Error('jobId is required');
        let result = await client.listJobCompensations(ctx.input.jobId);
        let compensations = Array.isArray(result) ? result : result.compensations || result;
        let mapped = compensations.map((c: any) => ({
          compensationId: c.uuid || c.id?.toString(),
          rate: c.rate,
          paymentUnit: c.payment_unit,
          flsaStatus: c.flsa_status,
          effectiveDate: c.effective_date
        }));
        return {
          output: { compensations: mapped },
          message: `Found **${mapped.length}** compensation(s) for job ${ctx.input.jobId}.`
        };
      }
      case 'create_compensation': {
        if (!ctx.input.jobId) throw new Error('jobId is required');
        let result = await client.createJobCompensation(ctx.input.jobId, {
          rate: ctx.input.rate,
          payment_unit: ctx.input.paymentUnit,
          flsa_status: ctx.input.flsaStatus,
          effective_date: ctx.input.effectiveDate
        });
        return {
          output: {
            compensation: {
              compensationId: result.uuid || result.id?.toString(),
              rate: result.rate,
              paymentUnit: result.payment_unit,
              flsaStatus: result.flsa_status,
              effectiveDate: result.effective_date,
              version: result.version
            }
          },
          message: `Created compensation of ${ctx.input.rate}/${ctx.input.paymentUnit} for job ${ctx.input.jobId}.`
        };
      }
      case 'update_compensation': {
        if (!ctx.input.compensationId) throw new Error('compensationId is required');
        let data: Record<string, any> = {};
        if (ctx.input.version) data.version = ctx.input.version;
        if (ctx.input.rate) data.rate = ctx.input.rate;
        if (ctx.input.paymentUnit) data.payment_unit = ctx.input.paymentUnit;
        if (ctx.input.flsaStatus) data.flsa_status = ctx.input.flsaStatus;
        if (ctx.input.effectiveDate) data.effective_date = ctx.input.effectiveDate;
        let result = await client.updateCompensation(ctx.input.compensationId, data);
        return {
          output: {
            compensation: {
              compensationId: result.uuid || result.id?.toString(),
              rate: result.rate,
              paymentUnit: result.payment_unit,
              flsaStatus: result.flsa_status,
              effectiveDate: result.effective_date,
              version: result.version
            }
          },
          message: `Updated compensation ${ctx.input.compensationId}.`
        };
      }
    }
  })
  .build();
