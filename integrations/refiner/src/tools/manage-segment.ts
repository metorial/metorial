import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let manageSegment = SlateTool.create(spec, {
  name: 'Manage Segment Membership',
  key: 'manage_segment',
  description: `Add or remove a user from a manual segment in Refiner. Identify the user by their user ID or email. If no user matches the provided identifier, a new user will be created when adding.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('External user ID'),
      email: z.string().optional().describe('Email address of the user'),
      segmentUuid: z.string().describe('UUID of the manual segment'),
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the user from the segment')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      contactUuid: z
        .string()
        .optional()
        .describe('UUID of the contact (returned when adding)'),
      segmentUuid: z.string().optional().describe('UUID of the segment (returned when adding)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });
    let identifier = ctx.input.userId || ctx.input.email || 'unknown';

    if (ctx.input.action === 'add') {
      let result = (await client.addUserToSegment({
        id: ctx.input.userId,
        email: ctx.input.email,
        segmentUuid: ctx.input.segmentUuid
      })) as any;

      return {
        output: {
          success: true,
          contactUuid: result.contact_uuid,
          segmentUuid: result.segment_uuid
        },
        message: `Added user **${identifier}** to segment **${ctx.input.segmentUuid}**.`
      };
    } else {
      await client.removeUserFromSegment({
        id: ctx.input.userId,
        email: ctx.input.email,
        segmentUuid: ctx.input.segmentUuid
      });

      return {
        output: { success: true },
        message: `Removed user **${identifier}** from segment **${ctx.input.segmentUuid}**.`
      };
    }
  })
  .build();
