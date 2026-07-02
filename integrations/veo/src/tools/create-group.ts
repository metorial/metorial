import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new group (community) in VEO. Groups are collaboration spaces where users share and discuss videos.`,
  instructions: [
    'Group types: 1 = Group (general collaboration), 2 = Video Bank (video collection), 3 = Community (timelines/files), 4 = Cohort (school-based).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the group'),
      description: z.string().describe('Description of the group'),
      typeId: z
        .number()
        .describe('Group type: 1 = Group, 2 = Video Bank, 3 = Community, 4 = Cohort'),
      privacyLevelId: z
        .number()
        .optional()
        .default(1)
        .describe('Privacy level ID (default: 1)'),
      visibilityId: z.number().optional().default(3).describe('Visibility ID (default: 3)'),
      inviteTypeId: z.number().optional().default(2).describe('Invite type ID (default: 2)'),
      postingPermissionTypeId: z
        .number()
        .optional()
        .default(1)
        .describe('Posting permission type ID (default: 1)'),
      commentPostsType: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether comments are enabled on posts')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the newly created group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.createGroup({
      name: ctx.input.name,
      description: ctx.input.description,
      typeId: ctx.input.typeId,
      privacyLevelId: ctx.input.privacyLevelId,
      visibilityId: ctx.input.visibilityId,
      inviteTypeId: ctx.input.inviteTypeId,
      postingPermissionTypeId: ctx.input.postingPermissionTypeId,
      commentPostsType: ctx.input.commentPostsType
    });

    let groupId = String(result.id ?? result.Id ?? result);

    return {
      output: { groupId },
      message: `Created group **"${ctx.input.name}"** with ID \`${groupId}\`.`
    };
  })
  .build();
