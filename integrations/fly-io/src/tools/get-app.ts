import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getApp = SlateTool.create(spec, {
  name: 'Get App',
  key: 'get_app',
  description: `Retrieve details for a specific Fly App including its status and organization. Use this to check an app's current state before performing operations on it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('Unique app identifier'),
      appName: z.string().describe('Name of the app'),
      status: z.string().describe('Current status of the app'),
      organization: z
        .object({
          name: z.string().describe('Organization name'),
          slug: z.string().describe('Organization slug')
        })
        .describe('Organization the app belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let app = await client.getApp(ctx.input.appName);

    return {
      output: app,
      message: `App **${app.appName}** is in **${app.status}** status, belonging to organization **${app.organization.name}**.`
    };
  })
  .build();
