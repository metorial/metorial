import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapApplication } from '../lib/mappers';
import { spec } from '../spec';

export let getApplicationTool = SlateTool.create(spec, {
  name: 'Get Application',
  key: 'get_application',
  description: `Retrieve detailed information about a specific application by its ID. Returns application status, current stage, source, associated jobs, rejection reason, and custom fields.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      applicationId: z.string().describe('The Greenhouse application ID')
    })
  )
  .output(
    z.object({
      applicationId: z.string(),
      candidateId: z.string(),
      prospect: z.boolean(),
      status: z.string().nullable(),
      appliedAt: z.string().nullable(),
      rejectedAt: z.string().nullable(),
      lastActivityAt: z.string().nullable(),
      source: z.object({ sourceId: z.string(), publicName: z.string().nullable() }).nullable(),
      currentStage: z.object({ stageId: z.string(), name: z.string() }).nullable(),
      jobs: z.array(z.object({ jobId: z.string(), name: z.string() })),
      jobPostId: z.string().nullable(),
      creditedTo: z.object({ userId: z.string(), name: z.string() }).nullable(),
      rejectionReason: z
        .object({ reasonId: z.string(), name: z.string(), type: z.string().nullable() })
        .nullable(),
      customFields: z.record(z.string(), z.any()),
      location: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let raw = await client.getApplication(Number.parseInt(ctx.input.applicationId, 10));
    let application = mapApplication(raw);

    return {
      output: application,
      message: `Retrieved application **${application.applicationId}** (status: ${application.status ?? 'unknown'}, stage: ${application.currentStage?.name ?? 'none'}).`
    };
  })
  .build();
