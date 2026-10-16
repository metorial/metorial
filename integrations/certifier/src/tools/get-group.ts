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
        designIds: group.designIds,
        name: group.name,
        certificateDesignId: group.certificateDesignId ?? null,
        badgeDesignId: group.badgeDesignId ?? null,
        learningEventUrl: group.learningEventUrl,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      },
      message: `Group **${group.name}** (\`${group.id}\`).`
    };
  })
  .build();
