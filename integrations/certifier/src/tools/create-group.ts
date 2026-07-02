import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new credential group. Groups are organizational containers for credentials, typically representing a course, program, or event. Each group is linked to certificate and/or badge designs.`,
  instructions: ['At least one of certificateDesignId or badgeDesignId is required.'],
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
      certificateDesignId: z.string().nullable().describe('Certificate design ID'),
      badgeDesignId: z.string().nullable().describe('Badge design ID'),
      learningEventUrl: z.string().nullable().describe('Learning event URL'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let group = await client.createGroup({
      name: ctx.input.name,
      certificateDesignId: ctx.input.certificateDesignId,
      badgeDesignId: ctx.input.badgeDesignId,
      learningEventUrl: ctx.input.learningEventUrl
    });

    return {
      output: {
        groupId: group.id,
        name: group.name,
        certificateDesignId: group.certificateDesignId,
        badgeDesignId: group.badgeDesignId,
        learningEventUrl: group.learningEventUrl,
        createdAt: group.createdAt
      },
      message: `Group **${group.name}** created with ID \`${group.id}\`.`
    };
  })
  .build();
