import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

let bindingSchema = z.object({
  role: z
    .string()
    .describe('IAM role (e.g. "roles/cloudfunctions.invoker", "roles/run.invoker")'),
  members: z
    .array(z.string())
    .describe(
      'Members bound to the role (e.g. "allUsers", "user:email@example.com", "serviceAccount:sa@project.iam.gserviceaccount.com")'
    )
});

export let manageIamPolicy = SlateTool.create(spec, {
  name: 'Manage IAM Policy',
  key: 'manage_iam_policy',
  description: `Get or set the IAM policy for a Cloud Function. Use this to control who can invoke the function or manage its configuration. To make a function publicly accessible, grant the **roles/run.invoker** role to **allUsers**.`,
  instructions: [
    'To read the current policy, set action to "get". To update the policy, set action to "set" and provide the bindings.',
    'When setting a policy, provide the complete set of bindings. The provided bindings will replace all existing bindings.',
    'Always get the current policy first before setting a new one to avoid overwriting existing bindings.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleCloudFunctionsActionScopes.manageIamPolicy)
  .input(
    z.object({
      action: z
        .enum(['get', 'set'])
        .describe('"get" to retrieve the current policy, "set" to update it'),
      functionName: z.string().describe('Short function name'),
      location: z
        .string()
        .optional()
        .describe('Region of the function. Defaults to configured region.'),
      bindings: z
        .array(bindingSchema)
        .optional()
        .describe('IAM bindings to set. Required when action is "set".'),
      etag: z
        .string()
        .optional()
        .describe('Etag from a previous get response for optimistic concurrency')
    })
  )
  .output(
    z.object({
      bindings: z.array(bindingSchema).describe('Current IAM bindings after the operation'),
      etag: z.string().optional().describe('Etag for optimistic concurrency control'),
      version: z.number().optional().describe('IAM policy version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.input.location || ctx.config.region
    });

    if (ctx.input.action === 'get') {
      let policy = await client.getIamPolicy(ctx.input.functionName, ctx.input.location);

      return {
        output: {
          bindings: policy.bindings || [],
          etag: policy.etag,
          version: policy.version
        },
        message: `IAM policy for **${ctx.input.functionName}** has **${(policy.bindings || []).length}** binding(s).`
      };
    } else {
      if (!ctx.input.bindings) {
        throw new Error('Bindings are required when action is "set"');
      }

      let policy = await client.setIamPolicy(
        ctx.input.functionName,
        { bindings: ctx.input.bindings, etag: ctx.input.etag },
        ctx.input.location
      );

      return {
        output: {
          bindings: policy.bindings || [],
          etag: policy.etag,
          version: policy.version
        },
        message: `IAM policy updated for **${ctx.input.functionName}** with **${(policy.bindings || []).length}** binding(s).`
      };
    }
  })
  .build();
