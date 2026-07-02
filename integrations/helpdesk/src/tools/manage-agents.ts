import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let agentSchema = z.object({
  id: z.string().describe('Unique agent identifier'),
  licenseID: z.string().optional().describe('License ID the agent belongs to'),
  email: z.string().describe('Agent email address'),
  name: z.string().describe('Agent display name'),
  roles: z.array(z.string()).describe('Roles assigned to the agent'),
  teamIDs: z.array(z.string()).describe('IDs of teams the agent belongs to'),
  status: z.enum(['active', 'invited']).describe('Current agent status'),
  avatar: z.string().optional().describe('URL to the agent avatar image'),
  jobTitle: z.string().optional().describe('Agent job title'),
  autoassignment: z
    .boolean()
    .optional()
    .describe('Whether the agent participates in automatic ticket assignment'),
  autoassignmentTeamIDs: z
    .array(z.string())
    .optional()
    .describe('Team IDs for which autoassignment is enabled'),
  signature: z.string().optional().describe('Agent email signature'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp when the agent was created'),
  updatedAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the agent was last updated')
});

export let manageAgents = SlateTool.create(spec, {
  name: 'Manage Agents',
  key: 'manage_agents',
  description: `List, get, create, update, and delete HelpDesk agents. Agents are team members who handle tickets and customer communication. Use this tool to manage the agents in your HelpDesk account, including their roles, team assignments, and autoassignment settings.`,
  instructions: [
    'Use "list" to retrieve all agents in the account.',
    'Use "get" with an agentId to retrieve a specific agent.',
    'Use "create" with email and name to invite a new agent.',
    'Use "update" with an agentId plus fields to modify an existing agent.',
    'Use "delete" with an agentId to remove an agent from the account.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform on agents'),
      agentId: z.string().optional().describe('Agent ID (required for get, update, delete)'),
      email: z.string().optional().describe('Agent email address (required for create)'),
      name: z
        .string()
        .optional()
        .describe('Agent display name (required for create, optional for update)'),
      roles: z
        .array(z.string())
        .optional()
        .describe('Roles to assign to the agent (e.g., ["admin", "agent"])'),
      teamIDs: z.array(z.string()).optional().describe('Team IDs to assign the agent to'),
      autoassignment: z
        .boolean()
        .optional()
        .describe('Whether the agent should participate in automatic ticket assignment'),
      autoassignmentTeamIDs: z
        .array(z.string())
        .optional()
        .describe('Team IDs for which autoassignment is enabled for this agent')
    })
  )
  .output(
    z.object({
      agents: z.array(agentSchema).optional().describe('List of agents (for list action)'),
      agent: agentSchema
        .optional()
        .describe('Single agent details (for get, create, update actions)'),
      deleted: z.boolean().optional().describe('Whether the agent was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let agents = await client.listAgents();
      return {
        output: { agents },
        message: `Found **${agents.length}** agent(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.agentId) {
        throw new Error('agentId is required for the "get" action');
      }
      let agent = await client.getAgent(ctx.input.agentId);
      return {
        output: { agent },
        message: `Retrieved agent **${agent.name}** (${agent.email}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.email) {
        throw new Error('email is required for the "create" action');
      }
      if (!ctx.input.name) {
        throw new Error('name is required for the "create" action');
      }
      let input: Record<string, unknown> = {
        email: ctx.input.email,
        name: ctx.input.name
      };
      if (ctx.input.roles !== undefined) input.roles = ctx.input.roles;
      if (ctx.input.teamIDs !== undefined) input.teamIDs = ctx.input.teamIDs;
      if (ctx.input.autoassignment !== undefined)
        input.autoassignment = ctx.input.autoassignment;
      if (ctx.input.autoassignmentTeamIDs !== undefined)
        input.autoassignmentTeamIDs = ctx.input.autoassignmentTeamIDs;

      let agent = await client.createAgent(input as any);
      return {
        output: { agent },
        message: `Created agent **${agent.name}** (${agent.email}) with status "${agent.status}".`
      };
    }

    if (action === 'update') {
      if (!ctx.input.agentId) {
        throw new Error('agentId is required for the "update" action');
      }
      let input: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) input.name = ctx.input.name;
      if (ctx.input.roles !== undefined) input.roles = ctx.input.roles;
      if (ctx.input.teamIDs !== undefined) input.teamIDs = ctx.input.teamIDs;
      if (ctx.input.autoassignment !== undefined)
        input.autoassignment = ctx.input.autoassignment;
      if (ctx.input.autoassignmentTeamIDs !== undefined)
        input.autoassignmentTeamIDs = ctx.input.autoassignmentTeamIDs;

      let agent = await client.updateAgent(ctx.input.agentId, input as any);
      return {
        output: { agent },
        message: `Updated agent **${agent.name}** (${agent.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.agentId) {
        throw new Error('agentId is required for the "delete" action');
      }
      await client.deleteAgent(ctx.input.agentId);
      return {
        output: { deleted: true },
        message: `Deleted agent **${ctx.input.agentId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
