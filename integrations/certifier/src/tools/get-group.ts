import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve a specific credential group by its ID. Returns the group's name, linked designs, and learning event URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to retrieve')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the group'),
      name: z.string().describe('Name of the group'),
      certificateDesignId: z.string().nullable().describe('Certificate design ID'),
      badgeDesignId: z.string().nullable().describe('Badge design ID'),
      learningEventUrl: z.string().nullable().describe('Learning event URL'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let group = await client.getGroup(ctx.input.groupId);

    return {
      output: {
        groupId: group.id,
        name: group.name,
        certificateDesignId: group.certificateDesignId,
        badgeDesignId: group.badgeDesignId,
        learningEventUrl: group.learningEventUrl,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      },
      message: `Group **${group.name}** (\`${group.id}\`).`
    };
  })
  .build();
