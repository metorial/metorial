import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { projectIdSchema, resolveProject } from '../lib/contracts';
import { spec } from '../spec';

export let upsertUserTool = SlateTool.create(spec, {
  name: 'Create or Update User',
  key: 'upsert_user',
  description: `Create a new user or update an existing user's traits in SatisMeter. Traits are custom properties (e.g., name, email, plan, createdAt) used for survey targeting and response segmentation. Omitted traits are not sent; the provider applies its native update rules.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      surveyDate: z
        .string()
        .optional()
        .describe(
          'Optional ISO 8601 date-time controlling the next eligible survey. For controlled test users, choose a future date to prevent delivery.'
        ),
      userId: z.string().describe('Unique user identifier as used in your system'),
      traits: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Custom user properties to set or update (e.g., { name: "John", email: "john@example.com", plan: "premium" })'
        )
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID that was created or updated'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    await client.upsertUser({
      userId: ctx.input.userId,
      traits: ctx.input.traits,
      projectId: resolveProject(ctx.input.projectId, ctx.config),
      surveyDate: ctx.input.surveyDate
    });

    return {
      output: { userId: ctx.input.userId, success: true },
      message: `Accepted creation/update for user **${ctx.input.userId}**.`
    };
  })
  .build();
