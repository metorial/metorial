import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { AuthClient } from '../lib/client';
import { firebaseServiceError } from '../lib/errors';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let lookupUser = SlateTool.create(spec, {
  name: 'Lookup User',
  key: 'lookup_user',
  description: `Look up a Firebase Authentication user by email address or phone number. Useful for finding a user when you don't know their user ID.`,
  tags: {
    readOnly: true
  }
})
  .scopes(firebaseActionScopes.lookupUser)
  .input(
    z.object({
      email: z.string().optional().describe('Email address to look up'),
      phoneNumber: z.string().optional().describe('Phone number in E.164 format to look up')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Firebase user ID'),
      email: z.string().optional().describe('User email address'),
      displayName: z.string().optional().describe('User display name'),
      phoneNumber: z.string().optional().describe('User phone number'),
      photoUrl: z.string().optional().describe('URL of user profile photo'),
      emailVerified: z.boolean().optional().describe('Whether the email is verified'),
      disabled: z.boolean().optional().describe('Whether the account is disabled'),
      createdAt: z.string().optional().describe('Account creation timestamp'),
      lastSignedInAt: z.string().optional().describe('Last sign-in timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AuthClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    if (!ctx.input.email && !ctx.input.phoneNumber) {
      throw firebaseServiceError('Either email or phoneNumber must be provided');
    }

    let user: any;
    if (ctx.input.email) {
      user = await client.getUserByEmail(ctx.input.email);
    } else {
      user = await client.getUserByPhoneNumber(ctx.input.phoneNumber!);
    }

    return {
      output: user,
      message: `Found user **${user.email || user.userId}**.`
    };
  })
  .build();
