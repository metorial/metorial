import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

let artifactSchema = z.object({
  name: z.string().optional().describe('Artifact file name'),
  url: z.string().optional().describe('Artifact download URL (authenticated)'),
  type: z.string().optional().describe('Artifact type'),
  size: z.number().optional().describe('Artifact size in bytes'),
  versionName: z.string().optional().describe('Version name of the artifact')
});

let commitSchema = z.object({
  authorEmail: z.string().optional().describe('Commit author email'),
  authorName: z.string().optional().describe('Commit author name'),
  commitMessage: z.string().optional().describe('Commit message'),
  hash: z.string().optional().describe('Commit hash'),
  url: z.string().optional().describe('URL to the commit')
});

let buildActionSchema = z.object({
  name: z.string().optional().describe('Build action name'),
  status: z.string().optional().describe('Build action status'),
  startedAt: z.string().optional().describe('When the action started'),
  finishedAt: z.string().optional().describe('When the action finished')
});

export let getBuild = SlateTool.create(spec, {
  name: 'Get Build',
  key: 'get_build',
  description: `Retrieve detailed status and information about a specific build, including its current status, commit details, artifacts, and build actions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      buildId: z.string().describe('ID of the build to retrieve')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('Unique build identifier'),
      appId: z.string().describe('Application ID'),
      status: z
        .string()
        .describe('Build status (e.g. queued, building, finished, failed, canceled)'),
      branch: z.string().optional().describe('Git branch'),
      tag: z.string().optional().describe('Git tag'),
      workflowId: z
        .string()
        .optional()
        .nullable()
        .describe('Workflow ID (Workflow Editor apps)'),
      fileWorkflowId: z
        .string()
        .optional()
        .nullable()
        .describe('Workflow ID from codemagic.yaml'),
      instanceType: z.string().optional().describe('Machine type used'),
      startedAt: z.string().optional().nullable().describe('Build start time'),
      finishedAt: z.string().optional().nullable().describe('Build finish time'),
      createdAt: z.string().optional().describe('Build creation time'),
      commit: commitSchema.optional().describe('Commit information'),
      artefacts: z.array(artifactSchema).optional().describe('Build artifacts'),
      buildActions: z
        .array(buildActionSchema)
        .optional()
        .describe('Individual build action steps'),
      labels: z.array(z.string()).optional().describe('Build labels'),
      message: z.string().optional().nullable().describe('Build message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });
    let build = await client.getBuild(ctx.input.buildId);

    let output = {
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
      commit: build.commit
        ? {
            authorEmail: build.commit.authorEmail,
            authorName: build.commit.authorName,
            commitMessage: build.commit.commitMessage,
            hash: build.commit.hash,
            url: build.commit.url
          }
        : undefined,
      artefacts: build.artefacts?.map(a => ({
        name: a.name,
        url: a.url,
        type: a.type,
        size: a.size,
        versionName: a.versionName
      })),
      buildActions: build.buildActions?.map(a => ({
        name: a.name,
        status: a.status,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt
      })),
      labels: build.labels,
      message: build.message
    };

    return {
      output,
      message: `Build **${build._id}** is **${build.status}**${build.branch ? ` on branch \`${build.branch}\`` : ''}${build.artefacts?.length ? ` with ${build.artefacts.length} artifact(s)` : ''}.`
    };
  })
  .build();
