import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let s3KeySchema = z.object({
  accessKey: z.string().describe('S3 access key'),
  secretKey: z.string().optional().describe('S3 secret key (only shown on creation)')
});

export let manageS3Keys = SlateTool.create(spec, {
  name: 'Manage S3 Credentials',
  key: 'manage_s3_keys',
  description: `List, generate, or delete S3 access credentials for Pilvio's StorageVault object storage. These keys are used to authenticate with the S3-compatible API.`
})
  .input(
    z.object({
      action: z.enum(['list', 'generate', 'delete']).describe('Operation to perform'),
      accessKey: z
        .string()
        .optional()
        .describe('Access key to delete (required for "delete" action)')
    })
  )
  .output(
    z.object({
      keys: z.array(s3KeySchema).optional().describe('List of S3 credentials'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action } = ctx.input;

    let mapKey = (k: any) => ({
      accessKey: k.accessKey || k.access_key,
      secretKey: k.secretKey || k.secret_key
    });

    switch (action) {
      case 'list': {
        let keys = await client.listS3Keys();
        let mapped = (Array.isArray(keys) ? keys : []).map(mapKey);
        return {
          output: { keys: mapped, success: true },
          message: `Found **${mapped.length}** S3 credential(s).`
        };
      }

      case 'generate': {
        let keys = await client.generateS3Key();
        let mapped = (Array.isArray(keys) ? keys : []).map(mapKey);
        return {
          output: { keys: mapped, success: true },
          message: `Generated new S3 credentials. **${mapped.length}** total key(s).`
        };
      }

      case 'delete': {
        if (!ctx.input.accessKey) throw new Error('accessKey is required for delete action');
        await client.deleteS3Key(ctx.input.accessKey);
        return {
          output: { success: true },
          message: `Deleted S3 key **${ctx.input.accessKey}**.`
        };
      }
    }
  })
  .build();
