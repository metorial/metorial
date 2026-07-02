import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAudience = SlateTool.create(spec, {
  name: 'Create Audience',
  key: 'create_audience',
  description: `Create an audience to organize contacts into groups for broadcast targeting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Audience name.')
    })
  )
  .output(
    z.object({
      audienceId: z.string().describe('ID of the created audience.'),
      name: z.string().describe('Audience name.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createAudience(ctx.input.name);

    return {
      output: {
        audienceId: result.id,
        name: result.name
      },
      message: `Audience **${result.name}** created with ID \`${result.id}\`.`
    };
  })
  .build();

export let listAudiences = SlateTool.create(spec, {
  name: 'List Audiences',
  key: 'list_audiences',
  description: `List all audiences in your Resend account.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      audiences: z
        .array(
          z.object({
            audienceId: z.string().describe('Audience ID.'),
            name: z.string().describe('Audience name.'),
            createdAt: z.string().optional().describe('Creation timestamp.')
          })
        )
        .describe('List of audiences.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAudiences({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let audiences = (result.data || []).map((a: any) => ({
      audienceId: a.id,
      name: a.name,
      createdAt: a.created_at
    }));

    return {
      output: {
        audiences,
        hasMore: result.has_more ?? false
      },
      message: `Found **${audiences.length}** audience(s).`
    };
  })
  .build();

export let deleteAudience = SlateTool.create(spec, {
  name: 'Delete Audience',
  key: 'delete_audience',
  description: `Permanently delete an audience. This is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      audienceId: z.string().describe('ID of the audience to delete.')
    })
  )
  .output(
    z.object({
      audienceId: z.string().describe('ID of the deleted audience.'),
      deleted: z.boolean().describe('Whether the audience was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteAudience(ctx.input.audienceId);

    return {
      output: {
        audienceId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Audience \`${result.id}\` has been **deleted**.`
    };
  })
  .build();
