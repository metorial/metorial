import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

let iamBindingSchema = z.object({
  role: z.string().describe('IAM role (e.g., "roles/storage.objectViewer")'),
  members: z
    .array(z.string())
    .describe(
      'List of members (e.g., ["user:alice@example.com", "serviceAccount:sa@project.iam.gserviceaccount.com"])'
    )
});

export let manageBucketIam = SlateTool.create(spec, {
  name: 'Manage Bucket IAM',
  key: 'manage_bucket_iam',
  description: `Get or set IAM policies on a Cloud Storage bucket. Use **action: "get"** to retrieve the current policy, or **action: "set"** to replace the entire policy with the provided bindings. Use **action: "add_binding"** or **action: "remove_binding"** to modify individual bindings without replacing the full policy.`,
  instructions: [
    'When adding or removing a binding, the tool fetches the current policy and modifies it accordingly.',
    'Common roles: roles/storage.admin, roles/storage.objectViewer, roles/storage.objectCreator, roles/storage.objectAdmin.'
  ],
  constraints: ['Requires full-control or cloud-platform scope.']
})
  .scopes(googleCloudStorageActionScopes.manageBucketIam)
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket'),
      action: z
        .enum(['get', 'set', 'add_binding', 'remove_binding'])
        .describe('IAM operation to perform'),
      bindings: z
        .array(iamBindingSchema)
        .optional()
        .describe('Full list of IAM bindings (required for "set" action)'),
      binding: iamBindingSchema.optional().describe('Single IAM binding to add or remove')
    })
  )
  .output(
    z.object({
      bucketName: z.string(),
      bindings: z.array(
        z.object({
          role: z.string(),
          members: z.array(z.string())
        })
      ),
      etag: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    if (ctx.input.action === 'get') {
      let policy = await client.getBucketIamPolicy(ctx.input.bucketName);
      return {
        output: {
          bucketName: ctx.input.bucketName,
          bindings: policy.bindings || [],
          etag: policy.etag
        },
        message: `Retrieved IAM policy for bucket **${ctx.input.bucketName}** with ${(policy.bindings || []).length} binding(s).`
      };
    }

    if (ctx.input.action === 'set') {
      if (!ctx.input.bindings) {
        throw new Error('bindings are required for "set" action');
      }
      let policy = await client.setBucketIamPolicy(ctx.input.bucketName, {
        bindings: ctx.input.bindings
      });
      return {
        output: {
          bucketName: ctx.input.bucketName,
          bindings: policy.bindings || [],
          etag: policy.etag
        },
        message: `Set IAM policy for bucket **${ctx.input.bucketName}** with ${(policy.bindings || []).length} binding(s).`
      };
    }

    if (ctx.input.action === 'add_binding') {
      if (!ctx.input.binding) {
        throw new Error('binding is required for "add_binding" action');
      }
      let currentPolicy = await client.getBucketIamPolicy(ctx.input.bucketName);
      let bindings: Array<{ role: string; members: string[] }> = currentPolicy.bindings || [];

      let existing = bindings.find((b: any) => b.role === ctx.input.binding!.role);
      if (existing) {
        let newMembers = ctx.input.binding.members.filter(m => !existing.members.includes(m));
        existing.members = [...existing.members, ...newMembers];
      } else {
        bindings.push(ctx.input.binding);
      }

      let policy = await client.setBucketIamPolicy(ctx.input.bucketName, {
        bindings,
        etag: currentPolicy.etag
      });
      return {
        output: {
          bucketName: ctx.input.bucketName,
          bindings: policy.bindings || [],
          etag: policy.etag
        },
        message: `Added IAM binding for role **${ctx.input.binding.role}** on bucket **${ctx.input.bucketName}**.`
      };
    }

    // remove_binding
    if (!ctx.input.binding) {
      throw new Error('binding is required for "remove_binding" action');
    }
    let currentPolicy = await client.getBucketIamPolicy(ctx.input.bucketName);
    let bindings: Array<{ role: string; members: string[] }> = currentPolicy.bindings || [];

    let existing = bindings.find((b: any) => b.role === ctx.input.binding!.role);
    if (existing) {
      existing.members = existing.members.filter(
        (m: string) => !ctx.input.binding!.members.includes(m)
      );
      if (existing.members.length === 0) {
        bindings = bindings.filter((b: any) => b.role !== ctx.input.binding!.role);
      }
    }

    let policy = await client.setBucketIamPolicy(ctx.input.bucketName, {
      bindings,
      etag: currentPolicy.etag
    });
    return {
      output: {
        bucketName: ctx.input.bucketName,
        bindings: policy.bindings || [],
        etag: policy.etag
      },
      message: `Removed IAM binding for role **${ctx.input.binding.role}** on bucket **${ctx.input.bucketName}**.`
    };
  })
  .build();
