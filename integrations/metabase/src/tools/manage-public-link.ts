import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let managePublicLink = SlateTool.create(spec, {
  name: 'Manage Public Link',
  key: 'manage_public_link',
  description: `Generate or revoke public sharing links for questions and dashboards in Metabase.
Public links allow anyone with the URL to view the question or dashboard without authentication.`,
  constraints: [
    'Requires superuser (admin) privileges.',
    'Public sharing must be enabled in the instance settings.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'revoke'])
        .describe('Whether to create or revoke a public link'),
      resourceType: z.enum(['question', 'dashboard']).describe('Type of resource to share'),
      resourceId: z.number().describe('ID of the question or dashboard')
    })
  )
  .output(
    z.object({
      uuid: z.string().optional().describe('The public link UUID'),
      publicUrl: z.string().optional().describe('The full public sharing URL'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'create') {
      let result: any;
      if (ctx.input.resourceType === 'question') {
        result = await client.createCardPublicLink(ctx.input.resourceId);
      } else {
        result = await client.createDashboardPublicLink(ctx.input.resourceId);
      }

      let uuid = result.uuid;
      let path = ctx.input.resourceType === 'question' ? 'question' : 'dashboard';
      let publicUrl = `${ctx.auth.instanceUrl}/public/${path}/${uuid}`;

      return {
        output: { uuid, publicUrl, success: true },
        message: `Created public link for ${ctx.input.resourceType} ${ctx.input.resourceId}: ${publicUrl}`
      };
    }

    // revoke
    if (ctx.input.resourceType === 'question') {
      await client.deleteCardPublicLink(ctx.input.resourceId);
    } else {
      await client.deleteDashboardPublicLink(ctx.input.resourceId);
    }

    return {
      output: { success: true },
      message: `Revoked public link for ${ctx.input.resourceType} ${ctx.input.resourceId}`
    };
  })
  .build();
