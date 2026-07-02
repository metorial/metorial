import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

let releaseOutputSchema = z.object({
  releaseId: z.string().optional().describe('Release ID'),
  referenceNum: z.string().optional().describe('Release reference number'),
  name: z.string().optional().describe('Release name'),
  description: z.string().optional().describe('Release description'),
  startDate: z.string().optional().describe('Start date'),
  releaseDate: z.string().optional().describe('Release date'),
  released: z.boolean().optional().describe('Whether the release has been released'),
  parkingLot: z.boolean().optional().describe('Whether this is a parking lot release'),
  status: z.string().optional().describe('Workflow status name'),
  url: z.string().optional().describe('Aha! URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deleted: z.boolean().optional().describe('True if the release was deleted')
});

export let manageRelease = SlateTool.create(spec, {
  name: 'Manage Release',
  key: 'manage_release',
  description: `Create, update, or delete a release in Aha!. Releases organize features into time-based milestones. You can set dates, descriptions, and parking lot status.`,
  instructions: [
    'To **create** a release, set action to "create" and provide a productId plus at least a name.',
    'To **update** a release, set action to "update" and provide the releaseId plus the fields to change.',
    'To **delete** a release, set action to "delete" and provide the releaseId.',
    'A **parking lot** release is used for unscheduled work.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      releaseId: z
        .string()
        .optional()
        .describe('Release ID or reference number (required for update/delete)'),
      productId: z
        .string()
        .optional()
        .describe('Product ID or reference prefix (required for create)'),
      name: z.string().optional().describe('Release name'),
      description: z.string().optional().describe('Release description (HTML supported)'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      releaseDate: z.string().optional().describe('Release date (YYYY-MM-DD)'),
      parkingLot: z.boolean().optional().describe('Mark as parking lot (unscheduled) release')
    })
  )
  .output(releaseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.productId) throw new Error('productId is required to create a release');
      if (!ctx.input.name) throw new Error('name is required to create a release');

      let release = await client.createRelease(ctx.input.productId, {
        name: ctx.input.name,
        description: ctx.input.description,
        startDate: ctx.input.startDate,
        releaseDate: ctx.input.releaseDate,
        parkingLot: ctx.input.parkingLot
      });

      return {
        output: {
          releaseId: release.id,
          referenceNum: release.reference_num,
          name: release.name,
          description: release.description,
          startDate: release.start_date,
          releaseDate: release.release_date,
          released: release.released,
          parkingLot: release.parking_lot,
          status: release.workflow_status?.name,
          url: release.url,
          createdAt: release.created_at,
          updatedAt: release.updated_at
        },
        message: `Created release **${release.reference_num}** — ${release.name}.`
      };
    }

    if (!ctx.input.releaseId) throw new Error('releaseId is required for this action');

    if (action === 'delete') {
      await client.deleteRelease(ctx.input.releaseId);
      return {
        output: { releaseId: ctx.input.releaseId, deleted: true },
        message: `Deleted release \`${ctx.input.releaseId}\`.`
      };
    }

    // update
    let release = await client.updateRelease(ctx.input.releaseId, {
      name: ctx.input.name,
      description: ctx.input.description,
      startDate: ctx.input.startDate,
      releaseDate: ctx.input.releaseDate,
      parkingLot: ctx.input.parkingLot
    });

    return {
      output: {
        releaseId: release.id,
        referenceNum: release.reference_num,
        name: release.name,
        description: release.description,
        startDate: release.start_date,
        releaseDate: release.release_date,
        released: release.released,
        parkingLot: release.parking_lot,
        status: release.workflow_status?.name,
        url: release.url,
        createdAt: release.created_at,
        updatedAt: release.updated_at
      },
      message: `Updated release **${release.reference_num}** — ${release.name}.`
    };
  })
  .build();
