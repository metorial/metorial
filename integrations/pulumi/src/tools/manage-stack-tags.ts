import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let manageStackTags = SlateTool.create(spec, {
  name: 'Manage Stack Tags',
  key: 'manage_stack_tags',
  tags: { destructive: true },
  description: `Set or delete tags on a Pulumi stack. Tags are key-value metadata used for categorization and querying. You can set a new tag, update an existing one, or delete a tag.`
})
  .input(
    z.object({
      organization: organizationInput,
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name'),
      action: z.enum(['set', 'delete']).describe('Action to perform on the tag'),
      tagName: z.string().describe('Tag name'),
      tagValue: z.string().optional().describe('Tag value (required for set action)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      action: z.string(),
      tagName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    if (ctx.input.action === 'set') {
      if (ctx.input.tagValue === undefined)
        throw createApiServiceError('tagValue is required when setting a tag');
      await client.setStackTag(
        org,
        ctx.input.projectName,
        ctx.input.stackName,
        ctx.input.tagName,
        ctx.input.tagValue
      );
    } else {
      await client.deleteStackTag(
        org,
        ctx.input.projectName,
        ctx.input.stackName,
        ctx.input.tagName
      );
    }

    return {
      output: {
        success: true,
        action: ctx.input.action,
        tagName: ctx.input.tagName
      },
      message:
        ctx.input.action === 'set'
          ? `Set tag **${ctx.input.tagName}**=\`${ctx.input.tagValue}\` on stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**`
          : `Deleted tag **${ctx.input.tagName}** from stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**`
    };
  })
  .build();
