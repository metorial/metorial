import { createApiServiceError, SlateTool } from 'slates';
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
        .describe('Legacy governance mode field; omit this field for platform API creation')
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
      deleted: z.boolean().optional().describe('Whether the consortium was deleted'),
      deletionRequested: z
        .boolean()
        .optional()
        .describe('Whether Kaleido accepted the deletion request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'create') {
      if (ctx.input.mode !== undefined) {
        throw createApiServiceError(
          'The platform consortium create API does not accept mode. Omit mode and configure governance in Kaleido.',
          { reason: 'unsupported_mode' }
        );
      }
      if (!ctx.input.name)
        throw createApiServiceError('Name is required for creating a consortium', {
          reason: 'invalid_input'
        });

      let result = await client.createConsortium({
        name: ctx.input.name,
        description: ctx.input.description
      });

      return {
        output: {
          consortiumId: result._id,
          name: result.name ?? undefined,
          description: result.description ?? undefined,
          mode: result.mode ?? undefined,
          state: result.state ?? undefined,
          createdAt: result.created_at ?? undefined,
          owner: result.owner ?? undefined
        },
        message: `Created consortium **${result.name}** (\`${result._id}\`).`
      };
    }

    if (!ctx.input.consortiumId)
      throw createApiServiceError('Consortium ID is required for get, update, and delete', {
        reason: 'invalid_input'
      });

    if (ctx.input.action === 'get') {
      let result = await client.getConsortium(ctx.input.consortiumId);
      return {
        output: {
          consortiumId: result._id,
          name: result.name ?? undefined,
          description: result.description ?? undefined,
          mode: result.mode ?? undefined,
          state: result.state ?? undefined,
          createdAt: result.created_at ?? undefined,
          owner: result.owner ?? undefined
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
          name: result.name ?? undefined,
          description: result.description ?? undefined,
          mode: result.mode ?? undefined,
          state: result.state ?? undefined,
          createdAt: result.created_at ?? undefined,
          owner: result.owner ?? undefined
        },
        message: `Updated consortium **${result.name}**.`
      };
    }

    // delete
    let result = await client.deleteConsortium(ctx.input.consortiumId);
    return {
      output: {
        consortiumId: ctx.input.consortiumId,
        deleted: result?.state === 'deleted',
        deletionRequested: true,
        state: result?.state ?? undefined
      },
      message: `Kaleido accepted the deletion request for consortium \`${ctx.input.consortiumId}\`.`
    };
  })
  .build();
