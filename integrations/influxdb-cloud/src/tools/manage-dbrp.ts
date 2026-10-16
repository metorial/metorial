import { SlateTool } from 'slates';
import { z } from 'zod';
import { optionalString, requireArray, resource } from '../lib/client';
import { createClient, orgIdInput } from '../lib/helpers';
import { spec } from '../spec';

export let dbrpSchema = z.object({
  raw: z.any().optional().describe('Complete provider resource'),
  dbrpId: z.string().describe('Unique DBRP mapping ID'),
  bucketId: z.string().describe('Mapped bucket ID'),
  database: z.string().describe('v1-compatible database name'),
  retentionPolicy: z.string().describe('v1-compatible retention policy name'),
  isDefault: z
    .boolean()
    .optional()
    .describe('Whether this is the default mapping for the database'),
  orgId: z.string().optional().describe('Organization ID')
});

export let listDBRPs = SlateTool.create(spec, {
  name: 'List DBRP Mappings',
  key: 'list_dbrps',
  description: `List all database/retention policy (DBRP) mappings for v1 compatibility.
DBRP mappings map legacy InfluxDB 1.x database and retention policy pairs to InfluxDB v2 buckets, enabling v1-compatible tools like Grafana to work with InfluxDB Cloud.`,
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(z.object({ orgId: orgIdInput }))
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      dbrps: z.array(dbrpSchema).describe('List of DBRP mappings')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listDBRPs();

    let dbrps = requireArray(result, 'content').map((d: any) => ({
      raw: d,
      dbrpId: resource(d, ['id', 'bucketID', 'database', 'retention_policy']).id,
      bucketId: d.bucketID,
      database: d.database,
      retentionPolicy: d.retention_policy,
      isDefault: d.default,
      orgId: optionalString(d.orgID)
    }));

    return {
      output: { dbrps, raw: result },
      message: `Found **${dbrps.length}** DBRP mapping(s).`
    };
  })
  .build();

export let createDBRP = SlateTool.create(spec, {
  name: 'Create DBRP Mapping',
  key: 'create_dbrp',
  description: `Create a new DBRP mapping to enable v1-compatible queries against an InfluxDB Cloud bucket. Maps a legacy database/retention policy pair to a v2 bucket.`,
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      bucketId: z.string().describe('ID of the bucket to map'),
      database: z.string().describe('v1-compatible database name'),
      retentionPolicy: z.string().describe('v1-compatible retention policy name'),
      isDefault: z
        .boolean()
        .optional()
        .describe('Whether this is the default mapping for the database')
    })
  )
  .output(dbrpSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let d = await client.createDBRP({
      bucketId: ctx.input.bucketId,
      database: ctx.input.database,
      retentionPolicy: ctx.input.retentionPolicy,
      isDefault: ctx.input.isDefault
    });

    return {
      output: {
        raw: d,
        dbrpId: resource(d, ['id', 'bucketID', 'database', 'retention_policy']).id,
        bucketId: d.bucketID,
        database: d.database,
        retentionPolicy: d.retention_policy,
        isDefault: d.default,
        orgId: optionalString(d.orgID)
      },
      message: `Created DBRP mapping: **${d.database}/${d.retention_policy}** -> bucket ${d.bucketID}.`
    };
  })
  .build();

export let deleteDBRP = SlateTool.create(spec, {
  name: 'Delete DBRP Mapping',
  key: 'delete_dbrp',
  description: `Delete a DBRP mapping. v1-compatible tools using this mapping will no longer be able to access the bucket.`,
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      dbrpId: z.string().describe('ID of the DBRP mapping to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the DBRP mapping was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteDBRP(ctx.input.dbrpId);

    return {
      output: { success: true },
      message: `Deleted DBRP mapping ${ctx.input.dbrpId}.`
    };
  })
  .build();
