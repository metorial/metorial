import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type UpdateGroupParams } from '../lib/client';
import { spec } from '../spec';

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update an existing credential group's name, linked designs, or learning event URL. Only provided fields are updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to update'),
      name: z.string().optional().describe('Updated group name'),
      designIds: z
        .array(z.string())
        .optional()
        .describe(
          'Ordered design IDs from list_designs. Replaces the complete design list; do not combine with legacy design fields.'
        ),
      certificateDesignId: z.string().optional().describe('Updated certificate design ID'),
      badgeDesignId: z.string().optional().describe('Updated badge design ID'),
      learningEventUrl: z.string().optional().describe('Updated learning event URL')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the updated group'),
      name: z.string().describe('Name of the group'),
      designIds: z
        .array(z.string())
        .optional()
        .describe('Ordered design IDs associated with this credential template'),
      certificateDesignId: z
        .string()
        .nullable()
        .describe(
          'Legacy certificate design ID when returned by Certifier; otherwise null. Use designIds for the ordered designs.'
        ),
      badgeDesignId: z
        .string()
        .nullable()
        .describe(
          'Legacy badge design ID when returned by Certifier; otherwise null. Use designIds for the ordered designs.'
        ),
      learningEventUrl: z.string().nullable().describe('Learning event URL'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateParams: UpdateGroupParams = {};
    if (ctx.input.designIds !== undefined) updateParams.designIds = ctx.input.designIds;
    if (ctx.input.name !== undefined) updateParams.name = ctx.input.name;
    if (ctx.input.certificateDesignId !== undefined)
      updateParams.certificateDesignId = ctx.input.certificateDesignId;
    if (ctx.input.badgeDesignId !== undefined)
      updateParams.badgeDesignId = ctx.input.badgeDesignId;
    if (ctx.input.learningEventUrl !== undefined)
      updateParams.learningEventUrl = ctx.input.learningEventUrl;

    let group = await client.updateGroup(ctx.input.groupId, updateParams);

    return {
      output: {
        groupId: group.id,
        designIds: group.designIds,
        name: group.name,
        certificateDesignId: group.certificateDesignId ?? null,
        badgeDesignId: group.badgeDesignId ?? null,
        learningEventUrl: group.learningEventUrl,
        updatedAt: group.updatedAt
      },
      message: `Group **${group.name}** (\`${group.id}\`) updated.`
    };
  })
  .build();
