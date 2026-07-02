import { SlateTool } from 'slates';
import { z } from 'zod';
import { kibanaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let agentPolicyOutputSchema = z.object({
  policyId: z.string().describe('Unique ID of the agent policy'),
  name: z.string().describe('Name of the agent policy'),
  description: z.string().optional().describe('Description of the policy'),
  namespace: z.string().optional().describe('Policy namespace'),
  status: z.string().optional().describe('Policy status'),
  monitoringEnabled: z
    .array(z.string())
    .optional()
    .describe('Enabled monitoring output types'),
  agentCount: z.number().optional().describe('Number of agents using this policy'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deleted: z.boolean().optional().describe('Whether the policy was deleted')
});

export let listAgentPolicies = SlateTool.create(spec, {
  name: 'List Agent Policies',
  key: 'list_agent_policies',
  description: `List Fleet agent policies in Kibana. Agent policies define what data agents collect and which integrations they run.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      kuery: z.string().optional().describe('KQL filter to search policies'),
      page: z.number().optional().describe('Page number (1-based)'),
      perPage: z.number().optional().describe('Number of results per page (default 20)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of policies'),
      page: z.number().describe('Current page'),
      perPage: z.number().describe('Results per page'),
      agentPolicies: z.array(agentPolicyOutputSchema).describe('List of agent policies')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getAgentPolicies({
      kuery: ctx.input.kuery,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let policies = (result.items ?? []).map((p: any) => ({
      policyId: p.id,
      name: p.name,
      description: p.description,
      namespace: p.namespace,
      status: p.status,
      monitoringEnabled: p.monitoring_enabled,
      agentCount: p.agents,
      updatedAt: p.updated_at
    }));

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? 20,
        agentPolicies: policies
      },
      message: `Found **${result.total ?? 0}** agent policies.`
    };
  })
  .build();

export let manageAgentPolicy = SlateTool.create(spec, {
  name: 'Manage Agent Policy',
  key: 'manage_agent_policy',
  description: `Create, get, update, or delete a Fleet agent policy. Agent policies define agent behavior, integrations, and monitoring configuration.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      policyId: z
        .string()
        .optional()
        .describe('ID of the agent policy (required for get, update, delete)'),
      name: z.string().optional().describe('Name of the policy (required for create)'),
      description: z.string().optional().describe('Description of the policy'),
      namespace: z.string().optional().describe('Policy namespace (e.g., "default")'),
      monitoringEnabled: z
        .array(z.string())
        .optional()
        .describe('Monitoring output types (e.g., ["logs", "metrics"])')
    })
  )
  .output(agentPolicyOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, policyId, name, description, namespace, monitoringEnabled } = ctx.input;

    if (action === 'get') {
      if (!policyId) throw kibanaServiceError('policyId is required for get action');
      let result = await client.getAgentPolicy(policyId);
      let p = result.item ?? result;
      return {
        output: {
          policyId: p.id,
          name: p.name,
          description: p.description,
          namespace: p.namespace,
          status: p.status,
          monitoringEnabled: p.monitoring_enabled,
          agentCount: p.agents,
          updatedAt: p.updated_at
        },
        message: `Retrieved agent policy \`${p.name}\`.`
      };
    }

    if (action === 'create') {
      if (!name) throw kibanaServiceError('name is required for create action');
      let result = await client.createAgentPolicy({
        name,
        description,
        namespace,
        monitoringEnabled
      });
      let p = result.item ?? result;
      return {
        output: {
          policyId: p.id,
          name: p.name,
          description: p.description,
          namespace: p.namespace,
          status: p.status,
          monitoringEnabled: p.monitoring_enabled,
          updatedAt: p.updated_at
        },
        message: `Created agent policy \`${p.name}\` with ID \`${p.id}\`.`
      };
    }

    if (action === 'update') {
      if (!policyId) throw kibanaServiceError('policyId is required for update action');
      let updateParams: Record<string, any> = {};
      if (name !== undefined) updateParams.name = name;
      if (description !== undefined) updateParams.description = description;
      if (namespace !== undefined) updateParams.namespace = namespace;
      if (monitoringEnabled) updateParams.monitoring_enabled = monitoringEnabled;

      let result = await client.updateAgentPolicy(policyId, updateParams);
      let p = result.item ?? result;
      return {
        output: {
          policyId: p.id ?? policyId,
          name: p.name ?? name ?? '',
          description: p.description,
          namespace: p.namespace,
          status: p.status,
          monitoringEnabled: p.monitoring_enabled,
          updatedAt: p.updated_at
        },
        message: `Updated agent policy \`${policyId}\`.`
      };
    }

    if (action === 'delete') {
      if (!policyId) throw kibanaServiceError('policyId is required for delete action');
      await client.deleteAgentPolicy(policyId);
      return {
        output: {
          policyId,
          name: '',
          deleted: true
        },
        message: `Deleted agent policy \`${policyId}\`.`
      };
    }

    throw kibanaServiceError(`Unknown action: ${action}`);
  })
  .build();

export let listFleetAgents = SlateTool.create(spec, {
  name: 'List Fleet Agents',
  key: 'list_fleet_agents',
  description: `List Elastic Agents managed by Fleet. Shows agent status, policy assignment, version, and host information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      kuery: z.string().optional().describe('KQL filter to search agents'),
      showInactive: z.boolean().optional().describe('Include inactive agents'),
      page: z.number().optional().describe('Page number (1-based)'),
      perPage: z.number().optional().describe('Number of results per page (default 20)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of agents'),
      page: z.number().describe('Current page'),
      perPage: z.number().describe('Results per page'),
      agents: z
        .array(
          z.object({
            agentId: z.string().describe('Unique ID of the agent'),
            status: z.string().optional().describe('Agent status'),
            hostname: z.string().optional().describe('Hostname of the agent'),
            policyId: z.string().optional().describe('Assigned agent policy ID'),
            version: z.string().optional().describe('Agent version'),
            lastCheckin: z.string().optional().describe('Last check-in timestamp'),
            enrolledAt: z.string().optional().describe('Enrollment timestamp')
          })
        )
        .describe('List of agents')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getAgents({
      kuery: ctx.input.kuery,
      showInactive: ctx.input.showInactive,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let agents = (result.items ?? result.list ?? []).map((a: any) => ({
      agentId: a.id,
      status: a.status,
      hostname: a.local_metadata?.host?.hostname ?? a.host?.hostname,
      policyId: a.policy_id,
      version: a.local_metadata?.elastic?.agent?.version ?? a.agent?.version,
      lastCheckin: a.last_checkin,
      enrolledAt: a.enrolled_at
    }));

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? 20,
        agents
      },
      message: `Found **${result.total ?? 0}** Fleet agents.`
    };
  })
  .build();

export let getEnrollmentTokens = SlateTool.create(spec, {
  name: 'Get Enrollment Tokens',
  key: 'get_enrollment_tokens',
  description: `Get Fleet enrollment API keys used to enroll new Elastic Agents.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      enrollmentTokens: z
        .array(
          z.object({
            tokenId: z.string().describe('ID of the enrollment token'),
            name: z.string().optional().describe('Name of the token'),
            policyId: z.string().optional().describe('Associated agent policy ID'),
            active: z.boolean().optional().describe('Whether the token is active'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of enrollment API keys')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getEnrollmentApiKeys();

    let tokens = (result.items ?? result.list ?? []).map((t: any) => ({
      tokenId: t.id,
      name: t.name,
      policyId: t.policy_id,
      active: t.active,
      createdAt: t.created_at
    }));

    return {
      output: { enrollmentTokens: tokens },
      message: `Found **${tokens.length}** enrollment tokens.`
    };
  })
  .build();
