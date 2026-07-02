import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let agentSchema = z.record(z.string(), z.any());

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List Docsumo agents configured on the account. Case-type agents return casetype_id values needed by the case tools; document-type agents return doc_type values for document workflows.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agentType: z
        .enum(['all', 'doctype', 'casetype'])
        .optional()
        .describe('Filter agents by type. Defaults to "all".')
    })
  )
  .output(
    z.object({
      agents: z.array(agentSchema).describe('Enabled Docsumo agents'),
      disabledAgents: z.array(agentSchema).describe('Disabled Docsumo agents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAgents({ agentType: ctx.input.agentType });

    return {
      output: result,
      message: `Found **${result.agents.length}** enabled Docsumo agent(s).`
    };
  })
  .build();
