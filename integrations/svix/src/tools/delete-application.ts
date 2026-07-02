import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteApplication = SlateTool.create(spec, {
  name: 'Delete Application',
  key: 'delete_application',
  description: `Permanently delete a consumer application and all its associated endpoints and messages. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the application was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Deleting application...');
    await client.deleteApplication(ctx.input.applicationId);

    return {
      output: { deleted: true },
      message: `Deleted application \`${ctx.input.applicationId}\`.`
    };
  })
  .build();
