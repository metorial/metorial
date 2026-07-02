import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Project Groups',
  key: 'list_groups',
  description: `Retrieve all project groups (folders) in your Spotlightr account. Groups are used to organize videos into collections.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(z.record(z.string(), z.any())).describe('List of project groups.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getGroups();
    let groups = Array.isArray(result) ? result : [result];

    return {
      output: {
        groups
      },
      message: `Retrieved **${groups.length}** project group(s).`
    };
  })
  .build();

export let createGroup = SlateTool.create(spec, {
  name: 'Create Project Group',
  key: 'create_group',
  description: `Create a new project group (folder) in your Spotlightr account to organize videos.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new project group.')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('Response from Spotlightr after creating the group.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createGroup(ctx.input.name);

    return {
      output: {
        result
      },
      message: `Created project group **"${ctx.input.name}"**.`
    };
  })
  .build();
