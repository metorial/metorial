import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePod = SlateTool.create(spec, {
  name: 'Manage Pod',
  key: 'manage_pod',
  description: `Create or delete a pod for multi-tenant isolation. Pods group inboxes and domains for a single customer/user/agent, keeping email data separate. A default pod is created when you sign up.
- **create**: Create a new pod
- **delete**: Delete an empty pod (all inboxes and domains must be removed first)`,
  constraints: [
    'You cannot delete a pod that still has inboxes or domains. Remove them first.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Operation to perform'),
      podId: z.string().optional().describe('Pod ID (required for delete)'),
      name: z.string().optional().describe('Pod name (for create)'),
      clientId: z.string().optional().describe('Client identifier for idempotent creation')
    })
  )
  .output(
    z.object({
      podId: z.string().optional().describe('Pod identifier'),
      name: z.string().optional().describe('Pod name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the pod was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    if (ctx.input.action === 'create') {
      let pod = await client.createPod(ctx.input.name, ctx.input.clientId);

      return {
        output: {
          podId: pod.pod_id,
          name: pod.name,
          createdAt: pod.created_at
        },
        message: `Created pod **${pod.name || pod.pod_id}**.`
      };
    }

    // delete
    if (!ctx.input.podId) throw new Error('podId is required for delete action');
    await client.deletePod(ctx.input.podId);

    return {
      output: { deleted: true },
      message: `Deleted pod **${ctx.input.podId}**.`
    };
  })
  .build();
