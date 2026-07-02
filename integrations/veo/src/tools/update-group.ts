import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update the properties of a VEO group (community). Only provide the fields you want to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to update'),
      name: z.string().optional().describe('Updated group name'),
      description: z.string().optional().describe('Updated group description'),
      typeId: z
        .number()
        .optional()
        .describe('Updated group type: 1 = Group, 2 = Video Bank, 3 = Community, 4 = Cohort'),
      privacyLevelId: z.number().optional().describe('Updated privacy level ID'),
      visibilityId: z.number().optional().describe('Updated visibility ID'),
      inviteTypeId: z.number().optional().describe('Updated invite type ID'),
      postingPermissionTypeId: z
        .number()
        .optional()
        .describe('Updated posting permission type ID'),
      commentPostsType: z
        .boolean()
        .optional()
        .describe('Whether comments are enabled on posts'),
      featureActivity: z.boolean().optional().describe('Enable/disable activity feature'),
      featureTimeline: z.boolean().optional().describe('Enable/disable timeline feature'),
      featureVideo: z.boolean().optional().describe('Enable/disable video feature'),
      featureFile: z.boolean().optional().describe('Enable/disable file feature')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    await client.updateGroup(ctx.input.groupId, {
      name: ctx.input.name,
      description: ctx.input.description,
      typeId: ctx.input.typeId,
      privacyLevelId: ctx.input.privacyLevelId,
      visibilityId: ctx.input.visibilityId,
      inviteTypeId: ctx.input.inviteTypeId,
      postingPermissionTypeId: ctx.input.postingPermissionTypeId,
      commentPostsType: ctx.input.commentPostsType,
      featureActivity: ctx.input.featureActivity,
      featureTimeline: ctx.input.featureTimeline,
      featureVideo: ctx.input.featureVideo,
      featureFile: ctx.input.featureFile
    });

    return {
      output: { success: true },
      message: `Updated group \`${ctx.input.groupId}\`.`
    };
  })
  .build();
