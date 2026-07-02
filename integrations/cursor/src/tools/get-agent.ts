import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

export let getAgent = SlateTool.create(spec, {
  name: 'Get Agent',
  key: 'get_agent',
  description: `Retrieve the current status and details of a Cursor cloud agent by its ID. Returns the agent's status, source repository, target branch/PR information, and a summary of work done.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent to retrieve (e.g. bc_abc123)')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Unique identifier of the agent'),
      agentName: z.string().describe('Name of the agent'),
      status: z.string().describe('Current status: CREATING, RUNNING, FINISHED, or ERROR'),
      repository: z.string().describe('Source repository URL'),
      ref: z.string().optional().describe('Source git ref'),
      branchName: z.string().optional().describe('Target branch name'),
      prUrl: z.string().optional().describe('Pull request URL if created'),
      agentUrl: z.string().optional().describe('URL to view the agent in Cursor'),
      summary: z.string().optional().describe('Summary of the work the agent performed'),
      createdAt: z.string().describe('ISO 8601 timestamp of agent creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let agent = await client.getAgent(ctx.input.agentId);

    return {
      output: {
        agentId: agent.id,
        agentName: agent.name,
        status: agent.status,
        repository: agent.source.repository,
        ref: agent.source.ref,
        branchName: agent.target?.branchName,
        prUrl: agent.target?.prUrl,
        agentUrl: agent.target?.url,
        summary: agent.summary,
        createdAt: agent.createdAt
      },
      message: `Agent **${agent.name}** (${agent.id}) is \`${agent.status}\`.${agent.summary ? `\n\nSummary: ${agent.summary}` : ''}${agent.target?.prUrl ? `\n\nPR: ${agent.target.prUrl}` : ''}`
    };
  })
  .build();
