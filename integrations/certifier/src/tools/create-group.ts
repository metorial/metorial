import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new credential group. Groups are organizational containers for credentials, typically representing a course, program, or event. Each group is linked to certificate and/or badge designs.`,
  instructions: [
    'Provide designIds from list_designs, or use the legacy certificateDesignId/badgeDesignId fields. Do not combine the two request shapes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Group name, used as the [group.name] attribute in credentials'),
      designIds: z
        .array(z.string())
        .optional()
        .describe(
          'Ordered design IDs from list_designs. Replaces the complete design list; do not combine with legacy design fields.'
        ),
      certificateDesignId: z
        .string()
        .optional()
        .describe('ID of the certificate design to use'),
      badgeDesignId: z.string().optional().describe('ID of the badge design to use'),
      learningEventUrl: z
        .string()
        .optional()
        .describe('URL of the learning event shown in the digital wallet')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the created group'),
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
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let group = await client.createGroup({
      name: ctx.input.name,
      designIds: ctx.input.designIds,
      certificateDesignId: ctx.input.certificateDesignId,
      badgeDesignId: ctx.input.badgeDesignId,
      learningEventUrl: ctx.input.learningEventUrl
    });

    return {
      output: {
        groupId: group.id,
        designIds: group.designIds,
        name: group.name,
        certificateDesignId: group.certificateDesignId ?? null,
        badgeDesignId: group.badgeDesignId ?? null,
        learningEventUrl: group.learningEventUrl,
        createdAt: group.createdAt
      },
      message: `Group **${group.name}** created with ID \`${group.id}\`.`
    };
  })
  .build();
