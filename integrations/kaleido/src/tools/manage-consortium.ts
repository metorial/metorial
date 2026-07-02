import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let manageConsortium = SlateTool.create(spec, {
  name: 'Manage Consortium',
  key: 'manage_consortium',
  description: `Create, update, retrieve, or delete a consortium. A consortium is the top-level organizational unit in Kaleido that groups blockchain networks, memberships, and environments.
Use this to set up new business networks, update consortium details, or remove consortia.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('Action to perform on the consortium'),
      consortiumId: z
        .string()
        .optional()
        .describe('Consortium ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Consortium name (required for create, optional for update)'),
      description: z.string().optional().describe('Consortium description'),
      mode: z
        .enum(['single-org', 'decentralized'])
        .optional()
        .describe('Consortium governance mode (only for create)')
    })
  )
  .output(
    z.object({
      consortiumId: z.string().optional().describe('Consortium ID'),
      name: z.string().optional().describe('Consortium name'),
      description: z.string().optional().describe('Consortium description'),
      mode: z.string().optional().describe('Consortium governance mode'),
      state: z.string().optional().describe('Consortium state'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      owner: z.string().optional().describe('Owning organization ID'),
      deleted: z.boolean().optional().describe('Whether the consortium was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating a consortium');

      let result = await client.createConsortium({
        name: ctx.input.name,
        description: ctx.input.description,
        mode: ctx.input.mode
      });

      return {
        output: {
          consortiumId: result._id,
          name: result.name,
          description: result.description,
          mode: result.mode,
          state: result.state,
          createdAt: result.created_at,
          owner: result.owner
        },
        message: `Created consortium **${result.name}** (\`${result._id}\`).`
      };
    }

    if (!ctx.input.consortiumId)
      throw new Error('Consortium ID is required for get, update, and delete');

    if (ctx.input.action === 'get') {
      let result = await client.getConsortium(ctx.input.consortiumId);
      return {
        output: {
          consortiumId: result._id,
          name: result.name,
          description: result.description,
          mode: result.mode,
          state: result.state,
          createdAt: result.created_at,
          owner: result.owner
        },
        message: `Retrieved consortium **${result.name}** — state: ${result.state || 'unknown'}.`
      };
    }

    if (ctx.input.action === 'update') {
      let updateParams: { name?: string; description?: string } = {};
      if (ctx.input.name) updateParams.name = ctx.input.name;
      if (ctx.input.description !== undefined)
        updateParams.description = ctx.input.description;

      let result = await client.updateConsortium(ctx.input.consortiumId, updateParams);
      return {
        output: {
          consortiumId: result._id,
          name: result.name,
          description: result.description,
          mode: result.mode,
          state: result.state,
          createdAt: result.created_at,
          owner: result.owner
        },
        message: `Updated consortium **${result.name}**.`
      };
    }

    // delete
    await client.deleteConsortium(ctx.input.consortiumId);
    return {
      output: {
        consortiumId: ctx.input.consortiumId,
        deleted: true
      },
      message: `Deleted consortium \`${ctx.input.consortiumId}\`.`
    };
  })
  .build();
