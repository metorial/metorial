import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let buildEvents = SlateTrigger.create(spec, {
  name: 'Build Events',
  key: 'build_events',
  description:
    'Triggers on build lifecycle events including build started, succeeded, failed, canceled, timed out, and completed with warnings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of build event'),
      eventId: z.string().describe('Unique identifier for this event'),
      buildProfileId: z.string().optional().describe('ID of the build profile'),
      buildProfileName: z.string().optional().describe('Name of the build profile'),
      branchName: z.string().optional().describe('Name of the branch'),
      commitHash: z.string().optional().describe('Commit hash that was built'),
      buildNumber: z.string().optional().describe('Build number'),
      buildStatus: z.string().optional().describe('Status of the build'),
      taskId: z.string().optional().describe('Task ID of the build'),
      raw: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z
      .object({
        buildProfileId: z.string().optional().describe('ID of the build profile'),
        buildProfileName: z.string().optional().describe('Name of the build profile'),
        branchName: z.string().optional().describe('Branch name'),
        commitHash: z.string().optional().describe('Commit hash'),
        buildNumber: z.string().optional().describe('Build number'),
        buildStatus: z.string().optional().describe('Current build status'),
        taskId: z.string().optional().describe('Task ID of the build')
      })
      .passthrough()
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body?.action ?? body?.event ?? body?.eventType ?? 'unknown';
      let eventId = body?.id ?? body?.eventId ?? body?.taskId ?? `build-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: String(eventId),
            buildProfileId: body?.buildProfileId ?? body?.profileId,
            buildProfileName: body?.buildProfileName ?? body?.profileName,
            branchName: body?.branchName ?? body?.branch,
            commitHash: body?.commitHash ?? body?.commit,
            buildNumber: body?.buildNumber,
            buildStatus: body?.status ?? body?.buildStatus,
            taskId: body?.taskId,
            raw: body
          }
        ]
      };
    },
    handleEvent: async ctx => {
      return {
        type: `build.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          buildProfileId: ctx.input.buildProfileId,
          buildProfileName: ctx.input.buildProfileName,
          branchName: ctx.input.branchName,
          commitHash: ctx.input.commitHash,
          buildNumber: ctx.input.buildNumber,
          buildStatus: ctx.input.buildStatus,
          taskId: ctx.input.taskId,
          ...ctx.input.raw
        }
      };
    }
  })
  .build();
