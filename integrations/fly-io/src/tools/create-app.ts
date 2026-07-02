import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createApp = SlateTool.create(spec, {
  name: 'Create App',
  key: 'create_app',
  description: `Create a new Fly App in an organization. Apps serve as named collections that group Machines, volumes, networking, and secrets. Optionally isolate the app on its own private network.`,
  constraints: ['App names must be globally unique across all Fly.io users.']
})
  .input(
    z.object({
      appName: z.string().describe('Unique name for the new app'),
      orgSlug: z.string().describe('Organization slug to create the app in'),
      network: z
        .string()
        .optional()
        .describe(
          'Optional custom network name to isolate this app into its own IPv6 private network'
        ),
      enableSubdomains: z
        .boolean()
        .optional()
        .describe('Whether to enable subdomains for the app')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('Unique identifier of the created app'),
      createdAt: z.number().describe('Timestamp when the app was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.createApp({
      appName: ctx.input.appName,
      orgSlug: ctx.input.orgSlug,
      network: ctx.input.network,
      enableSubdomains: ctx.input.enableSubdomains
    });

    return {
      output: result,
      message: `Created app **${ctx.input.appName}** in organization **${ctx.input.orgSlug}**.`
    };
  })
  .build();
