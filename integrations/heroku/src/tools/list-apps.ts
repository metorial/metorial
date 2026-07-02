import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List all Heroku applications accessible to the authenticated user. Returns app names, regions, stacks, URLs, and ownership details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      apps: z.array(
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
          ownerEmail: z.string().describe('Email of the app owner'),
          teamName: z.string().nullable().describe('Team the app belongs to, if any')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let apps = await client.listApps();

    return {
      output: {
        apps: apps.map(app => ({
          appId: app.appId,
          name: app.name,
          region: app.region,
          stack: app.stack,
          webUrl: app.webUrl,
          gitUrl: app.gitUrl,
          maintenance: app.maintenance,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          ownerEmail: app.ownerEmail,
          teamName: app.teamName
        }))
      },
      message: `Found **${apps.length}** app(s).`
    };
  })
  .build();
