import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runTemplate = SlateTool.create(spec, {
  name: 'Run Template',
  key: 'run_template',
  description: `Executes a Northflank infrastructure-as-code template. Templates can provision entire project setups including services, addons, secrets, pipelines, and domains.`,
  instructions: [
    'Provide the templateId and optionally pass arguments as key-value pairs that will be injected into the template run.'
  ]
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to run'),
      arguments: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value arguments to pass to the template')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template ID that was executed'),
      runId: z.string().optional().describe('ID of the template run'),
      status: z.string().optional().describe('Run status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let result = await client.runTemplate(ctx.input.templateId, ctx.input.arguments);

    return {
      output: {
        templateId: ctx.input.templateId,
        runId: result?.id || result?.runId,
        status: result?.status
      },
      message: `Template **${ctx.input.templateId}** executed successfully.`
    };
  })
  .build();
