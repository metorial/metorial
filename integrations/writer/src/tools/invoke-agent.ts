import { SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import { spec } from '../spec';

export let invokeAgent = SlateTool.create(spec, {
  name: 'Invoke No-Code Agent',
  key: 'invoke_agent',
  description: `Run a deployed no-code agent (application) as a microservice by providing its required inputs. Returns the generated output. Use **List Agents** first to find the agent ID and required input fields.`,
  instructions: [
    'Use the List Agents or get agent details tool first to discover the application ID and required inputs.',
    'Each input must include the field ID and an array of string values.',
    'Only text generation and research agents are supported. Chat agents cannot be invoked via this endpoint.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('ID (UUID) of the deployed no-code agent'),
      inputs: z
        .array(
          z.object({
            inputId: z.string().describe('Unique input field identifier'),
            value: z.array(z.string()).describe('Input field values')
          })
        )
        .describe('Input values for the agent')
    })
  )
  .output(
    z.object({
      outputs: z
        .array(
          z.object({
            title: z.string().describe('Output field name'),
            suggestion: z.string().describe('Generated content from the agent')
          })
        )
        .describe('Agent-generated outputs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    let inputs = ctx.input.inputs.map(i => ({
      id: i.inputId,
      value: i.value
    }));

    ctx.progress('Invoking no-code agent...');
    let results = await client.generateFromApplication(ctx.input.applicationId, inputs);

    let preview = results[0]?.suggestion || '';
    if (preview.length > 200) preview = `${preview.substring(0, 200)}...`;

    return {
      output: { outputs: results },
      message: `Agent generated **${results.length}** output(s).\n\n> ${preview}`
    };
  })
  .build();

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List deployed no-code agents (applications) in your Writer account. Returns agent metadata including IDs, names, and types. Use this to discover available agents and their application IDs before invoking them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of agents to return')
    })
  )
  .output(
    z.object({
      agents: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of agents with their metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Listing agents...');
    let agents = await client.listApplications({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    return {
      output: { agents },
      message: `Found **${agents.length}** agent(s)`
    };
  })
  .build();

export let getAgentDetails = SlateTool.create(spec, {
  name: 'Get Agent Details',
  key: 'get_agent_details',
  description: `Retrieve details of a specific no-code agent (application) including its required inputs, configuration, and capabilities. Use this to understand what inputs are needed before invoking an agent.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('ID (UUID) of the no-code agent')
    })
  )
  .output(
    z.object({
      agent: z
        .record(z.string(), z.unknown())
        .describe('Full agent details including inputs and configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Retrieving agent details...');
    let agent = await client.getApplication(ctx.input.applicationId);

    return {
      output: { agent },
      message: `Retrieved agent details for \`${ctx.input.applicationId}\``
    };
  })
  .build();
