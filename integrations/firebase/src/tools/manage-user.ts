import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { AuthClient } from '../lib/client';
import { firebaseServiceError, missingRequiredFieldError } from '../lib/errors';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string().describe('Firebase user ID'),
  email: z.string().optional().describe('User email address'),
  displayName: z.string().optional().describe('User display name'),
  phoneNumber: z.string().optional().describe('User phone number'),
  photoUrl: z.string().optional().describe('URL of user profile photo'),
  emailVerified: z.boolean().optional().describe('Whether the email is verified'),
  disabled: z.boolean().optional().describe('Whether the account is disabled'),
  createdAt: z.string().optional().describe('Account creation timestamp'),
  lastSignedInAt: z.string().optional().describe('Last sign-in timestamp'),
  deleted: z.boolean().optional().describe('Whether the user was deleted')
});

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, delete, or retrieve a Firebase Authentication user. Supports managing user properties including email, password, display name, phone number, photo, email verification status, and account disabled state.`,
  instructions: [
    'Use "create" to register a new user. At minimum provide email and password.',
    'Use "get" to retrieve a user by their Firebase user ID.',
    'Use "update" to modify user properties. Only provided fields are changed.',
    'Use "delete" to permanently remove a user account.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(firebaseActionScopes.manageUser)
  .input(
    z.object({
      operation: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('Operation to perform'),
      userId: z
        .string()
        .optional()
        .describe('Firebase user ID. Required for get, update, delete.'),
      email: z.string().optional().describe('User email. Used for create and update.'),
      password: z.string().optional().describe('User password. Used for create and update.'),
      displayName: z.string().optional().describe('Display name. Used for create and update.'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number in E.164 format. Used for create and update.'),
      photoUrl: z
        .string()
        .optional()
        .describe('Profile photo URL. Used for create and update.'),
      emailVerified: z
        .boolean()
        .optional()
        .describe('Email verification status. Used for create and update.'),
      disabled: z
        .boolean()
        .optional()
        .describe('Whether to disable the account. Used for create and update.'),
      customClaims: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Custom claims to set on the user (update only). Max 1000 bytes when serialized.'
        )
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AuthClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      apiKey: ctx.config.webApiKey
    });

    let { operation, userId } = ctx.input;

    if (operation === 'get') {
      if (!userId) throw missingRequiredFieldError('userId', 'get');
      let user = await client.getUser(userId);
      return {
        output: user,
        message: `Retrieved user **${user.email || userId}**.`
      };
    }

    if (operation === 'create') {
      let user = await client.createUser({
        email: ctx.input.email,
        password: ctx.input.password,
        displayName: ctx.input.displayName,
        phoneNumber: ctx.input.phoneNumber,
        photoUrl: ctx.input.photoUrl,
        emailVerified: ctx.input.emailVerified,
        disabled: ctx.input.disabled
      });
      return {
        output: user,
        message: `Created user **${user.email || user.userId}**.`
      };
    }

    if (operation === 'update') {
      if (!userId) throw missingRequiredFieldError('userId', 'update');
      let user = await client.updateUser(userId, {
        email: ctx.input.email,
        password: ctx.input.password,
        displayName: ctx.input.displayName,
        phoneNumber: ctx.input.phoneNumber,
        photoUrl: ctx.input.photoUrl,
        emailVerified: ctx.input.emailVerified,
        disabled: ctx.input.disabled
      });

      if (ctx.input.customClaims) {
        await client.setCustomClaims(userId, ctx.input.customClaims);
      }

      return {
        output: user,
        message: `Updated user **${user.email || userId}**.`
      };
    }

    if (operation === 'delete') {
      if (!userId) throw missingRequiredFieldError('userId', 'delete');
      await client.deleteUser(userId);
      return {
        output: {
          userId,
          deleted: true
        },
        message: `Deleted user **${userId}**.`
      };
    }

    throw firebaseServiceError(`Unknown operation: ${operation}`);
  })
  .build();
