import { SlateTool } from 'slates';
import { z } from 'zod';
import { HNClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a Hacker News user profile by username. Returns karma, creation date, bio, and recent submission IDs.
Usernames are case-sensitive.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      username: z.string().describe('Case-sensitive Hacker News username')
    })
  )
  .output(
    z.object({
      username: z.string().describe("The user's username"),
      createdAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the account was created'),
      karma: z.number().describe("User's karma score"),
      about: z.string().optional().describe("User's self-description (HTML)"),
      submittedIds: z
        .array(z.number())
        .optional()
        .describe("IDs of the user's submitted items (stories, comments, etc.)")
    })
  )
  .handleInvocation(async ctx => {
    let client = new HNClient();
    let user = await client.getUser(ctx.input.username);

    if (!user) {
      return {
        output: {
          username: ctx.input.username,
          karma: 0
        },
        message: `User **${ctx.input.username}** was not found.`
      };
    }

    let createdAt = user.created ? new Date(user.created * 1000).toISOString() : undefined;

    return {
      output: {
        username: user.id,
        createdAt,
        karma: user.karma,
        about: user.about,
        submittedIds: user.submitted
      },
      message: `Retrieved profile for **${user.id}** with **${user.karma}** karma${user.submitted ? ` and ${user.submitted.length} submissions` : ''}.`
    };
  })
  .build();
