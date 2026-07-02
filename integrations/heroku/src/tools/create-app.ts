import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createApp = SlateTool.create(spec, {
  name: 'Create App',
  key: 'create_app',
  description: `Create a new Heroku application. Optionally specify a name, region, and stack. If no name is provided, Heroku generates one automatically.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Name for the app (auto-generated if omitted)'),
      region: z.string().optional().describe('Region to create the app in (e.g., "us", "eu")'),
      stack: z.string().optional().describe('Stack to use (e.g., "heroku-22", "heroku-24")')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('Unique identifier of the created app'),
      name: z.string().describe('Name of the created app'),
      region: z.string().describe('Region where the app runs'),
      stack: z.string().describe('Stack used by the app'),
      webUrl: z.string().describe('Web URL of the app'),
      gitUrl: z.string().describe('Git URL for deploying to the app'),
      createdAt: z.string().describe('When the app was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let app = await client.createApp({
      name: ctx.input.name,
      region: ctx.input.region,
      stack: ctx.input.stack
    });

    return {
      output: {
        appId: app.appId,
        name: app.name,
        region: app.region,
        stack: app.stack,
        webUrl: app.webUrl,
        gitUrl: app.gitUrl,
        createdAt: app.createdAt
      },
      message: `Created app **${app.name}** in ${app.region} on ${app.stack}.`
    };
  })
  .build();
