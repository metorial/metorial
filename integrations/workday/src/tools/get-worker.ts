import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkdayClient } from '../lib/client';
import { spec } from '../spec';

let workdayReferenceSchema = z.object({
  id: z.string().optional().describe('Workday ID'),
  descriptor: z.string().optional().describe('Display name'),
  href: z.string().optional().describe('API href')
});

export let getWorker = SlateTool.create(spec, {
  name: 'Get Worker',
  key: 'get_worker',
  description: `Retrieve detailed information about a specific worker by their ID. Returns the full worker profile including personal information, employment details, position, compensation, organizational assignments, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workerId: z.string().describe('The Workday worker ID')
    })
  )
  .output(
    z.object({
      workerId: z.string().describe('Unique worker ID'),
      displayName: z.string().describe('Worker display name'),
      href: z.string().optional().describe('API href for this worker'),
      primaryWorkEmail: z.string().optional().describe('Primary work email address'),
      businessTitle: z.string().optional().describe('Business title'),
      supervisoryOrganization: workdayReferenceSchema
        .optional()
        .describe('Primary supervisory organization'),
      primaryPosition: workdayReferenceSchema.optional().describe('Primary position'),
      hireDate: z.string().optional().describe('Hire date in YYYY-MM-DD format'),
      isActive: z.boolean().optional().describe('Whether the worker is currently active'),
      isTerminated: z.boolean().optional().describe('Whether the worker has been terminated'),
      statusDate: z.string().optional().describe('Date of the current worker status'),
      additionalProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional worker properties returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let worker = await client.getWorker(ctx.input.workerId);

    let {
      id,
      descriptor,
      href,
      primaryWorkEmail,
      businessTitle,
      primarySupervisoryOrganization,
      primaryPosition,
      hireDate,
      workerStatus,
      ...rest
    } = worker;

    return {
      output: {
        workerId: id,
        displayName: descriptor,
        href,
        primaryWorkEmail,
        businessTitle,
        supervisoryOrganization: primarySupervisoryOrganization,
        primaryPosition,
        hireDate,
        isActive: workerStatus?.active,
        isTerminated: workerStatus?.terminated,
        statusDate: workerStatus?.statusDate,
        additionalProperties: Object.keys(rest).length > 0 ? rest : undefined
      },
      message: `Retrieved worker **${descriptor}** (${id})${businessTitle ? ` — ${businessTitle}` : ''}. Status: ${workerStatus?.active ? 'Active' : workerStatus?.terminated ? 'Terminated' : 'Unknown'}.`
    };
  })
  .build();
