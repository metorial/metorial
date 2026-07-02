import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createApp = SlateTool.create(spec, {
  name: 'Create App',
  key: 'create_app',
  description: `Create a new Retool application. Optionally place it in a specific folder.`
})
  .input(
    z.object({
      appName: z.string().describe('Name for the new application'),
      folderId: z.string().optional().describe('ID of the folder to place the app in'),
      description: z.string().optional().describe('Description of the application')
    })
  )
  .output(
    z.object({
      appId: z.string(),
      appName: z.string(),
      folderId: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.createApp({
      name: ctx.input.appName,
      folderId: ctx.input.folderId,
      description: ctx.input.description
    });

    let a = result.data;

    return {
      output: {
        appId: a.id,
        appName: a.name,
        folderId: a.folder_id
      },
      message: `Created app **${a.name}** with ID \`${a.id}\`.`
    };
  })
  .build();
