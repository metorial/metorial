import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateApp = SlateTool.create(spec, {
  name: 'Update App',
  key: 'update_app',
  description: `Update a Heroku application's settings. Can rename the app, toggle maintenance mode, or change the build stack.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appIdOrName: z.string().describe('Current app name or unique identifier'),
      name: z.string().optional().describe('New name for the app'),
      maintenance: z.boolean().optional().describe('Enable or disable maintenance mode'),
      buildStack: z.string().optional().describe('New build stack for the app')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('Unique identifier of the app'),
      name: z.string().describe('Name of the app'),
      region: z.string().describe('Region where the app runs'),
      stack: z.string().describe('Stack used by the app'),
      maintenance: z.boolean().describe('Whether the app is in maintenance mode'),
      webUrl: z.string().describe('Web URL of the app'),
      updatedAt: z.string().describe('When the app was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let app = await client.updateApp(ctx.input.appIdOrName, {
      name: ctx.input.name,
      maintenance: ctx.input.maintenance,
      buildStack: ctx.input.buildStack
    });

    return {
      output: {
        appId: app.appId,
        name: app.name,
        region: app.region,
        stack: app.stack,
        maintenance: app.maintenance,
        webUrl: app.webUrl,
        updatedAt: app.updatedAt
      },
      message: `Updated app **${app.name}**.`
    };
  })
  .build();
