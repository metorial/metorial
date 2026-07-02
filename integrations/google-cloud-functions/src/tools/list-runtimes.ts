import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

let runtimeSchema = z.object({
  name: z.string().describe('Runtime identifier (e.g. "nodejs20", "python312")'),
  displayName: z.string().optional().describe('Human-readable name'),
  stage: z
    .string()
    .optional()
    .describe('Lifecycle stage: SUPPORTED, DEPRECATED, DECOMMISSIONED, etc.'),
  warnings: z.array(z.string()).optional().describe('Any warnings about this runtime'),
  environment: z.string().optional().describe('Compatible environment (GEN_1, GEN_2)')
});

export let listRuntimes = SlateTool.create(spec, {
  name: 'List Runtimes',
  key: 'list_runtimes',
  description: `List available runtime environments for Cloud Functions, including their lifecycle status (supported, deprecated, decommissioned). Useful for choosing a runtime when creating or updating functions.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudFunctionsActionScopes.listRuntimes)
  .input(
    z.object({
      location: z
        .string()
        .optional()
        .describe('Region to check runtime availability. Defaults to configured region.')
    })
  )
  .output(
    z.object({
      runtimes: z.array(runtimeSchema).describe('Available runtime environments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.input.location || ctx.config.region
    });

    let response = await client.listRuntimes(ctx.input.location);
    let runtimes = (response.runtimes || []).map((rt: any) => ({
      name: rt.name,
      displayName: rt.displayName,
      stage: rt.stage,
      warnings: rt.warnings,
      environment: rt.environment
    }));

    let supported = runtimes.filter((r: any) => r.stage === 'SUPPORTED' || r.stage === 'GA');

    return {
      output: { runtimes },
      message: `Found **${runtimes.length}** runtimes (**${supported.length}** actively supported) in **${ctx.input.location || ctx.config.region}**.`
    };
  })
  .build();
