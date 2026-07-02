import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let buildStatusTrigger = SlateTrigger.create(spec, {
  name: 'Build Status Change',
  key: 'build_status_change',
  description:
    'Polls for build status changes across all applications or a specific application. Detects new builds and builds that have transitioned to a terminal state (finished, failed, canceled).'
})
  .input(
    z.object({
      buildId: z.string().describe('ID of the build'),
      appId: z.string().describe('ID of the application'),
      status: z.string().describe('Current build status'),
      branch: z.string().optional().describe('Git branch'),
      tag: z.string().optional().describe('Git tag'),
      workflowId: z.string().optional().nullable().describe('Workflow ID'),
      fileWorkflowId: z
        .string()
        .optional()
        .nullable()
        .describe('Workflow ID from codemagic.yaml'),
      instanceType: z.string().optional().describe('Machine type'),
      startedAt: z.string().optional().nullable().describe('Build start time'),
      finishedAt: z.string().optional().nullable().describe('Build finish time'),
      createdAt: z.string().optional().describe('Build creation time'),
      commitHash: z.string().optional().describe('Commit hash'),
      commitMessage: z.string().optional().describe('Commit message'),
      commitAuthor: z.string().optional().describe('Commit author name'),
      labels: z.array(z.string()).optional().describe('Build labels')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('Unique build identifier'),
      appId: z.string().describe('Application ID'),
      status: z
        .string()
        .describe('Build status (queued, building, finished, failed, canceled)'),
      branch: z.string().optional().describe('Git branch'),
      tag: z.string().optional().describe('Git tag'),
      workflowId: z.string().optional().nullable().describe('Workflow ID'),
      fileWorkflowId: z
        .string()
        .optional()
        .nullable()
        .describe('Workflow ID from codemagic.yaml'),
      instanceType: z.string().optional().describe('Machine type'),
      startedAt: z.string().optional().nullable().describe('Build start time'),
      finishedAt: z.string().optional().nullable().describe('Build finish time'),
      createdAt: z.string().optional().describe('Build creation time'),
      commitHash: z.string().optional().describe('Commit hash'),
      commitMessage: z.string().optional().describe('Commit message'),
      commitAuthor: z.string().optional().describe('Commit author name'),
      labels: z.array(z.string()).optional().describe('Build labels')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CodemagicClient({ token: ctx.auth.token });

      let builds = await client.listBuilds();

      let knownStatuses: Record<string, string> =
        (ctx.state?.knownStatuses as Record<string, string>) ?? {};
      let inputs: Array<{
        buildId: string;
        appId: string;
        status: string;
        branch?: string;
        tag?: string;
        workflowId?: string | null;
        fileWorkflowId?: string | null;
        instanceType?: string;
        startedAt?: string | null;
        finishedAt?: string | null;
        createdAt?: string;
        commitHash?: string;
        commitMessage?: string;
        commitAuthor?: string;
        labels?: string[];
      }> = [];

      let updatedStatuses: Record<string, string> = {};

      for (let build of builds) {
        let previousStatus = knownStatuses[build._id];
        updatedStatuses[build._id] = build.status;

        if (!previousStatus || previousStatus !== build.status) {
          inputs.push({
            buildId: build._id,
            appId: build.appId,
            status: build.status,
            branch: build.branch,
            tag: build.tag,
            workflowId: build.workflowId,
            fileWorkflowId: build.fileWorkflowId,
            instanceType: build.instanceType,
            startedAt: build.startedAt,
            finishedAt: build.finishedAt,
            createdAt: build.createdAt,
            commitHash: build.commit?.hash,
            commitMessage: build.commit?.commitMessage,
            commitAuthor: build.commit?.authorName,
            labels: build.labels
          });
        }
      }

      return {
        inputs,
        updatedState: {
          knownStatuses: updatedStatuses
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `build.${ctx.input.status}`,
        id: `${ctx.input.buildId}-${ctx.input.status}`,
        output: {
          buildId: ctx.input.buildId,
          appId: ctx.input.appId,
          status: ctx.input.status,
          branch: ctx.input.branch,
          tag: ctx.input.tag,
          workflowId: ctx.input.workflowId,
          fileWorkflowId: ctx.input.fileWorkflowId,
          instanceType: ctx.input.instanceType,
          startedAt: ctx.input.startedAt,
          finishedAt: ctx.input.finishedAt,
          createdAt: ctx.input.createdAt,
          commitHash: ctx.input.commitHash,
          commitMessage: ctx.input.commitMessage,
          commitAuthor: ctx.input.commitAuthor,
          labels: ctx.input.labels
        }
      };
    }
  })
  .build();
