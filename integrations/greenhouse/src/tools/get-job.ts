import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapJob } from '../lib/mappers';
import { spec } from '../spec';

export let getJobTool = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve detailed information about a specific job by its ID. Returns job details including departments, offices, hiring team, openings, stages, and custom fields.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      jobId: z.string().describe('The Greenhouse job ID'),
      includeStages: z
        .boolean()
        .optional()
        .describe('Also fetch the interview stages for this job')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      name: z.string(),
      requisitionId: z.string().nullable(),
      status: z.string().nullable(),
      confidential: z.boolean(),
      isTemplate: z.boolean(),
      notes: z.string().nullable(),
      departments: z.array(z.object({ departmentId: z.string(), name: z.string() })),
      offices: z.array(z.object({ officeId: z.string(), name: z.string() })),
      hiringTeam: z
        .object({
          hiringManagers: z.array(z.object({ userId: z.string(), name: z.string() })),
          recruiters: z.array(z.object({ userId: z.string(), name: z.string() })),
          coordinators: z.array(z.object({ userId: z.string(), name: z.string() }))
        })
        .nullable(),
      openings: z.array(
        z.object({
          openingId: z.string(),
          status: z.string().nullable(),
          openedAt: z.string().nullable(),
          closedAt: z.string().nullable()
        })
      ),
      stages: z
        .array(
          z.object({
            stageId: z.string(),
            name: z.string(),
            priority: z.number().nullable()
          })
        )
        .optional(),
      customFields: z.record(z.string(), z.any()),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable(),
      openedAt: z.string().nullable(),
      closedAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let raw = await client.getJob(Number.parseInt(ctx.input.jobId, 10));
    let job = mapJob(raw);

    let stages: Array<{ stageId: string; name: string; priority: number | null }> | undefined;
    if (ctx.input.includeStages) {
      let rawStages = await client.getJobStages(Number.parseInt(ctx.input.jobId, 10));
      stages = rawStages.map((s: any) => ({
        stageId: s.id?.toString(),
        name: s.name ?? '',
        priority: s.priority ?? null
      }));
    }

    return {
      output: { ...job, stages },
      message: `Retrieved job **${job.name}** (ID: ${job.jobId}, status: ${job.status ?? 'unknown'}).${stages ? ` Has ${stages.length} interview stage(s).` : ''}`
    };
  })
  .build();
