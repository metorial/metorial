import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSubdomain = SlateTool.create(spec, {
  name: 'Get Workers Subdomain',
  key: 'get_subdomain',
  description: `Retrieve the account's workers.dev subdomain and optionally check whether a specific Worker is enabled on it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z
        .string()
        .optional()
        .describe('Optionally check whether a specific Worker is enabled on workers.dev')
    })
  )
  .output(
    z.object({
      subdomain: z.string().optional().describe('Account workers.dev subdomain name'),
      scriptEnabled: z
        .boolean()
        .optional()
        .describe('Whether the specified Worker is enabled on workers.dev'),
      previewsEnabled: z
        .boolean()
        .optional()
        .describe('Whether previews are enabled for the specified Worker on workers.dev')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let subdomainResult = await client.getSubdomain();

    let scriptStatus: any;
    if (ctx.input.scriptName) {
      scriptStatus = await client.getScriptSubdomain(ctx.input.scriptName);
    }

    return {
      output: {
        subdomain: subdomainResult?.subdomain,
        scriptEnabled: scriptStatus?.enabled,
        previewsEnabled: scriptStatus?.previews_enabled
      },
      message: ctx.input.scriptName
        ? `Subdomain: **${subdomainResult?.subdomain}.workers.dev** — Worker **${ctx.input.scriptName}** is ${scriptStatus?.enabled ? 'enabled' : 'disabled'}.`
        : `Account subdomain: **${subdomainResult?.subdomain}.workers.dev**.`
    };
  })
  .build();

export let setScriptSubdomain = SlateTool.create(spec, {
  name: 'Toggle Worker Subdomain',
  key: 'set_script_subdomain',
  description: `Enable or disable a Worker on the workers.dev subdomain. When enabled, the Worker is accessible at \`<script>.<subdomain>.workers.dev\`.`
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      enabled: z.boolean().describe('Whether to enable the Worker on workers.dev'),
      previewsEnabled: z
        .boolean()
        .optional()
        .describe('Whether to enable preview URLs on workers.dev')
    })
  )
  .output(
    z.object({
      enabled: z.boolean().describe('Whether the Worker is now enabled on workers.dev'),
      previewsEnabled: z.boolean().optional().describe('Whether previews are enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.setScriptSubdomain(
      ctx.input.scriptName,
      ctx.input.enabled,
      ctx.input.previewsEnabled
    );

    return {
      output: {
        enabled: result.enabled,
        previewsEnabled: result.previews_enabled
      },
      message: `Worker **${ctx.input.scriptName}** is now ${result.enabled ? 'enabled' : 'disabled'} on workers.dev.`
    };
  })
  .build();
