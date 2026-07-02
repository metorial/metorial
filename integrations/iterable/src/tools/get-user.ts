import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieves a user profile from Iterable by **email** or **userId**. Returns the full user profile including all custom data fields and subscription preferences.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the user to look up'),
      userId: z.string().optional().describe('User ID to look up')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('User email address'),
      userId: z.string().optional().describe('User ID'),
      profileFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('All profile data fields'),
      signupDate: z.string().optional().describe('When the user was created'),
      signupSource: z.string().optional().describe('Source of the user signup')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    let result = await client.getUser({
      email: ctx.input.email,
      userId: ctx.input.userId
    });

    let user = result.user || result;

    return {
      output: {
        email: user.email,
        userId: user.userId,
        profileFields: user.dataFields,
        signupDate: user.signupDate,
        signupSource: user.signupSource
      },
      message: `Retrieved user profile for **${user.email || user.userId || 'unknown'}**.`
    };
  })
  .build();
