import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApp = SlateTool.create(spec, {
  name: 'Get App',
  key: 'get_app',
  description: `Retrieve detailed information about a specific Heroku app by its name or ID. Returns full app configuration including region, stack, URLs, maintenance status, and ownership.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('Unique identifier of the app'),
      name: z.string().describe('Name of the app'),
      region: z.string().describe('Region where the app runs'),
      stack: z.string().describe('Stack used by the app'),
      webUrl: z.string().describe('Web URL of the app'),
      gitUrl: z.string().describe('Git URL for deploying to the app'),
      maintenance: z.boolean().describe('Whether the app is in maintenance mode'),
      createdAt: z.string().describe('When the app was created'),
      updatedAt: z.string().describe('When the app was last updated'),
      releasedAt: z.string().nullable().describe('When the app was last released'),
      buildStack: z.string().describe('Build stack of the app'),
      ownerEmail: z.string().describe('Email of the app owner'),
      ownerId: z.string().describe('ID of the app owner'),
      teamName: z.string().nullable().describe('Team the app belongs to, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let app = await client.getApp(ctx.input.appIdOrName);

    return {
      output: app,
      message: `Retrieved app **${app.name}** (${app.region}, ${app.stack}).`
    };
  })
  .build();
