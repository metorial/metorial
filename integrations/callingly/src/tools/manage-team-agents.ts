import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeamAgents = SlateTool.create(spec, {
  name: 'Manage Team Agents',
  key: 'manage_team_agents',
  description: `List, assign, remove, or update agents within a team. Use the **action** parameter to specify the operation:
- **list** — List all agents currently assigned to the team.
- **assign** — Assign one or more agents to the team.
- **remove** — Remove an agent from the team.
- **update** — Update an agent's priority and lead cap within the team.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      action: z.enum(['list', 'assign', 'remove', 'update']).describe('Operation to perform'),
      agentIds: z
        .array(z.string())
        .optional()
        .describe('Agent IDs to assign (required for "assign" action)'),
      agentId: z
        .string()
        .optional()
        .describe('Agent ID (required for "remove" and "update" actions)'),
      priority: z
        .number()
        .optional()
        .describe('Priority level for the agent within the team (for "update" action)'),
      cap: z
        .number()
        .optional()
        .describe('Lead cap for the agent within the team (for "update" action)')
    })
  )
  .output(
    z.object({
      agents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID'),
            name: z.string().optional().describe('Agent name'),
            priority: z.number().optional().describe('Priority within team'),
            cap: z.number().optional().describe('Lead cap')
          })
        )
        .optional()
        .describe('List of agents on the team'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listTeamAgents(ctx.input.teamId);
      let agentsArray = Array.isArray(result) ? result : (result.agents ?? result.data ?? []);

      let agents = agentsArray.map((agent: any) => ({
        agentId: String(agent.id),
        name: agent.name ?? `${agent.fname ?? ''} ${agent.lname ?? ''}`.trim(),
        priority: agent.priority,
        cap: agent.cap
      }));

      return {
        output: { agents },
        message: `Team **${ctx.input.teamId}** has **${agents.length}** agent(s).`
      };
    }

    if (ctx.input.action === 'assign') {
      await client.assignAgentsToTeam(ctx.input.teamId, ctx.input.agentIds!);
      return {
        output: { success: true },
        message: `Assigned **${ctx.input.agentIds!.length}** agent(s) to team **${ctx.input.teamId}**.`
      };
    }

    if (ctx.input.action === 'remove') {
      await client.removeAgentFromTeam(ctx.input.teamId, ctx.input.agentId!);
      return {
        output: { success: true },
        message: `Removed agent **${ctx.input.agentId}** from team **${ctx.input.teamId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      await client.updateTeamAgent(ctx.input.teamId, ctx.input.agentId!, {
        priority: ctx.input.priority,
        cap: ctx.input.cap
      });
      return {
        output: { success: true },
        message: `Updated agent **${ctx.input.agentId}** settings in team **${ctx.input.teamId}**.`
      };
    }

    return {
      output: { success: false },
      message: `Unknown action: ${ctx.input.action}`
    };
  })
  .build();
