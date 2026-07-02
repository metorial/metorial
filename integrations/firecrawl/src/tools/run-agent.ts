import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runAgentTool = SlateTool.create(spec, {
  name: 'Run Agent',
  key: 'run_agent',
  description: `Start a Firecrawl v2 agent job for autonomous web data gathering. Use this for open-ended research or extraction tasks where Firecrawl should search, navigate, and gather data from one or more sites.`,
  instructions: [
    'Provide a natural-language prompt describing the data to gather.',
    'Optionally constrain the agent to specific URLs or provide a JSON Schema for structured output.',
    'Use Get Agent Status to poll results and Cancel Agent to stop a running job.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z.string().describe('Natural-language description of what data to gather'),
      urls: z.array(z.string()).optional().describe('URLs to constrain the agent to'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON Schema for structuring gathered data'),
      maxCredits: z.number().optional().describe('Maximum credits the agent can consume'),
      strictConstrainToURLs: z
        .boolean()
        .optional()
        .describe('If true, the agent may only visit provided URLs'),
      model: z
        .enum(['spark-1-mini', 'spark-1-pro'])
        .optional()
        .describe('Agent model: spark-1-mini or spark-1-pro')
    })
  )
  .output(
    z.object({
      agentId: z
        .string()
        .describe('Unique ID for the agent job; use get_agent_status with it'),
      success: z.boolean().optional().describe('Whether Firecrawl accepted the agent job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.startAgent({
      prompt: ctx.input.prompt,
      urls: ctx.input.urls,
      schema: ctx.input.schema,
      maxCredits: ctx.input.maxCredits,
      strictConstrainToURLs: ctx.input.strictConstrainToURLs,
      model: ctx.input.model
    });

    return {
      output: {
        agentId: result.id,
        success: result.success
      },
      message: `Started agent job \`${result.id}\`${ctx.input.model ? ` using ${ctx.input.model}` : ''}.`
    };
  });
