import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

export let listAgentArtifacts = SlateTool.create(spec, {
  name: 'List Agent Artifacts',
  key: 'list_agent_artifacts',
  description: `List files produced by a Cursor cloud agent. Returns the file paths, sizes, and timestamps. Artifacts are retained for 6 months.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent to list artifacts for')
    })
  )
  .output(
    z.object({
      artifacts: z.array(
        z.object({
          absolutePath: z.string().describe('Full file path of the artifact'),
          sizeBytes: z.number().describe('File size in bytes'),
          updatedAt: z.string().describe('ISO 8601 timestamp of last update')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.listArtifacts(ctx.input.agentId);

    return {
      output: {
        artifacts: result.artifacts.map(a => ({
          absolutePath: a.absolutePath,
          sizeBytes: a.sizeBytes,
          updatedAt: a.updatedAt
        }))
      },
      message: `Found **${result.artifacts.length}** artifact(s).`
    };
  })
  .build();
