import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listOrgVolumes = SlateTool.create(spec, {
  name: 'List Organization Volumes',
  key: 'list_org_volumes',
  description:
    'List Fly Volumes across an organization, with filters for region, state, deletion status, and pagination. Use this for storage inventory across apps.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgSlug: z.string().describe('Fly.io organization slug'),
      includeDeleted: z.boolean().optional().describe('Include deleted volumes'),
      region: z.string().optional().describe('Filter by region code'),
      state: z.string().optional().describe('Comma-separated volume states to include'),
      summary: z.boolean().optional().describe('Only return volume summary fields'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return volumes updated after this RFC 3339 timestamp'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum volumes to request, up to 1000')
    })
  )
  .output(
    z.object({
      volumes: z
        .array(
          z.object({
            appName: z.string().describe('App the volume belongs to'),
            volumeId: z.string().describe('Volume ID'),
            volumeName: z.string().describe('Volume name'),
            state: z.string().describe('Volume state'),
            sizeGb: z.number().describe('Volume size in GB'),
            region: z.string().describe('Region code'),
            zone: z.string().describe('Hardware zone'),
            encrypted: z.boolean().describe('Whether the volume is encrypted'),
            attachedMachineId: z.string().nullable().describe('Attached machine ID, if any'),
            autoBackupEnabled: z.boolean().describe('Whether automatic backups are enabled'),
            snapshotRetention: z.number().describe('Snapshot retention in days'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('Organization volumes'),
      nextCursor: z.string().describe('Cursor for the next page, if any'),
      lastVolumeId: z.string().describe('Last volume ID in the response'),
      lastUpdatedAt: z.string().describe('Last updated_at value in the response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listOrgVolumes(ctx.input.orgSlug, {
      includeDeleted: ctx.input.includeDeleted,
      region: ctx.input.region,
      state: ctx.input.state,
      summary: ctx.input.summary,
      updatedAfter: ctx.input.updatedAfter,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    return {
      output: result,
      message: `Found **${result.volumes.length}** volume(s) in organization **${ctx.input.orgSlug}**.`
    };
  })
  .build();
