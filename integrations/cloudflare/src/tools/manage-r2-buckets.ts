import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageR2BucketsTool = SlateTool.create(spec, {
  name: 'Manage R2 Buckets',
  key: 'manage_r2_buckets',
  description: `List, create, get details, or delete R2 object storage buckets. R2 is Cloudflare's S3-compatible object storage with zero egress fees.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'get', 'delete']).describe('Operation to perform'),
      accountId: z.string().optional().describe('Account ID (uses config if not provided)'),
      bucketName: z
        .string()
        .optional()
        .describe('Bucket name (required for create, get, delete)'),
      locationHint: z
        .string()
        .optional()
        .describe('Location hint for bucket creation (e.g. wnam, enam, weur, eeur, apac)'),
      storageClass: z
        .enum(['Standard', 'InfrequentAccess'])
        .optional()
        .describe('Storage class for newly uploaded objects'),
      jurisdiction: z
        .enum(['default', 'eu', 'fedramp'])
        .optional()
        .describe('Jurisdiction where bucket objects are guaranteed to be stored')
    })
  )
  .output(
    z.object({
      buckets: z
        .array(
          z.object({
            name: z.string(),
            creationDate: z.string().optional(),
            location: z.string().optional(),
            storageClass: z.string().optional(),
            jurisdiction: z.string().optional()
          })
        )
        .optional(),
      bucket: z
        .object({
          name: z.string(),
          creationDate: z.string().optional(),
          location: z.string().optional(),
          storageClass: z.string().optional(),
          jurisdiction: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let accountId = ctx.input.accountId || ctx.config.accountId;
    if (!accountId) throw cloudflareServiceError('accountId is required');

    let client = new Client(ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let response = await client.listR2Buckets(accountId);
      let bucketList = response.result?.buckets || response.result || [];
      let buckets = (Array.isArray(bucketList) ? bucketList : []).map((b: any) => ({
        name: b.name,
        creationDate: b.creation_date,
        location: b.location,
        storageClass: b.storage_class,
        jurisdiction: b.jurisdiction
      }));
      return {
        output: { buckets },
        message: `Found **${buckets.length}** R2 bucket(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.bucketName) throw cloudflareServiceError('bucketName is required');
      let response = await client.createR2Bucket(accountId, {
        name: ctx.input.bucketName,
        locationHint: ctx.input.locationHint,
        storageClass: ctx.input.storageClass,
        jurisdiction: ctx.input.jurisdiction
      });
      let bucket = response.result || {};
      return {
        output: {
          bucket: {
            name: bucket.name || ctx.input.bucketName,
            creationDate: bucket.creation_date,
            location: bucket.location || ctx.input.locationHint,
            storageClass: bucket.storage_class || ctx.input.storageClass,
            jurisdiction: bucket.jurisdiction || ctx.input.jurisdiction
          }
        },
        message: `Created R2 bucket **${ctx.input.bucketName}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.bucketName) throw cloudflareServiceError('bucketName is required');
      let response = await client.getR2Bucket(accountId, ctx.input.bucketName);
      let b = response.result;
      return {
        output: {
          bucket: {
            name: b.name,
            creationDate: b.creation_date,
            location: b.location,
            storageClass: b.storage_class,
            jurisdiction: b.jurisdiction
          }
        },
        message: `R2 bucket **${b.name}** — Location: ${b.location || 'auto'}`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.bucketName) throw cloudflareServiceError('bucketName is required');
      await client.deleteR2Bucket(accountId, ctx.input.bucketName);
      return {
        output: { deleted: true },
        message: `Deleted R2 bucket **${ctx.input.bucketName}**.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
