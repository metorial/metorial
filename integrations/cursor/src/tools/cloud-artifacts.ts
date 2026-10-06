import { createApiServiceError, getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { CurrentAgentsClient, cloudArtifactSchema } from '../lib/current-client';
import { spec } from '../spec';

export const listCloudAgentArtifacts = SlateTool.create(spec, {
  name: 'List Cloud Agent Artifacts',
  key: 'list_cloud_agent_artifacts',
  description:
    'List downloadable files produced by a durable cloud agent. Paths are relative to its workspace and can be passed directly to download_cloud_artifact.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      agentId: z
        .string()
        .min(1)
        .describe('Agent ID from create_cloud_agent or list_cloud_agents.')
    })
  )
  .output(z.object({ artifacts: z.array(cloudArtifactSchema) }))
  .handleInvocation(async ctx => {
    const result = await new CurrentAgentsClient(ctx.auth).listArtifacts(ctx.input.agentId);
    return {
      output: { artifacts: result.items },
      message: `Found **${result.items.length}** file(s).`
    };
  })
  .build();

export const downloadCloudArtifact = SlateTool.create(spec, {
  name: 'Download Cloud Artifact',
  key: 'download_cloud_artifact',
  description:
    'Prepare a downloadable file produced by a durable cloud agent. Use a relative path from list_cloud_agent_artifacts.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Agent ID.'),
      artifactPath: z
        .string()
        .min(1)
        .describe(
          'Relative path from list_cloud_agent_artifacts, such as artifacts/report.txt. Absolute legacy paths are not accepted.'
        )
    })
  )
  .output(z.object({ agentId: z.string(), artifactPath: z.string(), expiresAt: z.string() }))
  .handleInvocation(async ctx => {
    const path = ctx.input.artifactPath;
    if (!path.startsWith('artifacts/') || path.split('/').includes('..'))
      throw createApiServiceError(
        'Use the relative path under artifacts/ returned by list_cloud_agent_artifacts.'
      );
    const result = await new CurrentAgentsClient(ctx.auth).downloadArtifact(
      ctx.input.agentId,
      path
    );
    await ctx.addAttachment({
      type: 'url',
      url: result.url,
      refreshReference: { version: 'v1', agentId: ctx.input.agentId, artifactPath: path },
      refreshAt: result.expiresAt
    });
    return {
      output: { agentId: ctx.input.agentId, artifactPath: path, expiresAt: result.expiresAt },
      message: `Prepared **${path}** for download.`
    };
  })
  .build();

const referenceSchema = z.object({
  version: z.enum(['v0', 'v1']),
  agentId: z.string().min(1),
  artifactPath: z.string().min(1)
});
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError('The file reference is invalid. Request the file again.');
  const { version, agentId, artifactPath } = reference.data;
  const result =
    version === 'v1'
      ? await new CurrentAgentsClient(ctx.auth).downloadArtifact(agentId, artifactPath)
      : await new CloudAgentsClient(ctx.auth).downloadArtifact(agentId, artifactPath);
  return { url: result.url, expiresAt: result.expiresAt };
});
