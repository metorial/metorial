import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDatasource = SlateTool.create(spec, {
  name: 'Manage Data Source',
  key: 'manage_datasource',
  description: `Get details, update, delete, or trigger extract refresh for a data source. Use the **action** field to select the operation.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'delete', 'refresh']).describe('Operation to perform'),
      datasourceId: z.string().describe('LUID of the data source'),
      name: z.string().optional().describe('New name (for update)'),
      description: z.string().optional().describe('New description (for update)'),
      projectId: z.string().optional().describe('New project LUID (for update)'),
      ownerUserId: z.string().optional().describe('New owner LUID (for update)'),
      isCertified: z.boolean().optional().describe('Certification status (for update)'),
      certificationNote: z.string().optional().describe('Certification note (for update)')
    })
  )
  .output(
    z.object({
      datasourceId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      contentUrl: z.string().optional(),
      type: z.string().optional(),
      isCertified: z.boolean().optional(),
      certificationNote: z.string().optional(),
      projectId: z.string().optional(),
      projectName: z.string().optional(),
      ownerId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      connections: z.array(z.any()).optional(),
      jobId: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, datasourceId } = ctx.input;

    if (action === 'get') {
      let ds = await client.getDatasource(datasourceId);
      let conns = await client.getDatasourceConnections(datasourceId);

      return {
        output: {
          datasourceId: ds.id,
          name: ds.name,
          description: ds.description,
          contentUrl: ds.contentUrl,
          type: ds.type,
          isCertified: ds.isCertified,
          certificationNote: ds.certificationNote,
          projectId: ds.project?.id,
          projectName: ds.project?.name,
          ownerId: ds.owner?.id,
          createdAt: ds.createdAt,
          updatedAt: ds.updatedAt,
          connections: conns.connections?.connection || []
        },
        message: `Retrieved data source **${ds.name}** with ${(conns.connections?.connection || []).length} connections.`
      };
    }

    if (action === 'update') {
      if (
        ctx.input.name === undefined &&
        ctx.input.description === undefined &&
        ctx.input.projectId === undefined &&
        ctx.input.ownerUserId === undefined &&
        ctx.input.isCertified === undefined &&
        ctx.input.certificationNote === undefined
      ) {
        throw tableauServiceError('Provide at least one field to update a data source.');
      }

      let ds = await client.updateDatasource(datasourceId, {
        name: ctx.input.name,
        description: ctx.input.description,
        projectId: ctx.input.projectId,
        ownerUserId: ctx.input.ownerUserId,
        isCertified: ctx.input.isCertified,
        certificationNote: ctx.input.certificationNote
      });

      return {
        output: {
          datasourceId: ds.id,
          name: ds.name,
          description: ds.description,
          contentUrl: ds.contentUrl,
          type: ds.type,
          isCertified: ds.isCertified,
          certificationNote: ds.certificationNote,
          projectId: ds.project?.id,
          projectName: ds.project?.name,
          ownerId: ds.owner?.id,
          updatedAt: ds.updatedAt
        },
        message: `Updated data source **${ds.name}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteDatasource(datasourceId);
      return {
        output: { datasourceId, deleted: true },
        message: `Deleted data source \`${datasourceId}\`.`
      };
    }

    if (action === 'refresh') {
      let job = await client.refreshDatasource(datasourceId);
      return {
        output: { datasourceId, jobId: job?.id },
        message: `Triggered extract refresh for data source \`${datasourceId}\`. Job ID: \`${job?.id}\`.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
