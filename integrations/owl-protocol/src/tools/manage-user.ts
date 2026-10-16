import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  OwlClient,
  owlNumber,
  owlString,
  requireChainId,
  requireInput,
  requireOwlString,
  userLookup
} from '../lib/client';
import { listInputSchema, rawSchema } from '../lib/schemas';
import { spec } from '../spec';

let userOutputSchema = z.object({
  raw: rawSchema,
  userId: z.string().optional().describe('Owl Protocol user ID'),
  email: z.string().optional().describe('User email address'),
  fullName: z.string().optional().describe('User full name'),
  externalId: z.string().optional().describe('External identifier'),
  walletAddress: z.string().optional().describe('User wallet address')
});

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create or update a project user profile by email. Use get_user to retrieve the user's Safe wallet address for a particular blockchain.`,
  instructions: [
    'Call get_user with a chain ID to retrieve the user wallet address.',
    'Users can be referenced by email when minting tokens.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address for the new user'),
      fullName: z.string().optional().describe('Full name of the user'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier to link this user to your system')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    ctx.info({ message: 'Creating user', email: ctx.input.email });

    requireInput(ctx.input.email, 'email');
    let result = await client.createUser({
      email: ctx.input.email,
      fullName: ctx.input.fullName,
      externalId: ctx.input.externalId
    });

    return {
      output: {
        raw: result,
        userId: requireOwlString(
          result.userId === undefined ? result.id : result.userId,
          'user ID'
        ),
        email: requireOwlString(result.email, 'user email'),
        fullName: owlString(result.fullName),
        externalId: owlString(result.externalId),
        walletAddress: owlString(result.walletAddress) ?? owlString(result.safeAddress)
      },
      message: `Saved project user **${ctx.input.email}**${owlString(result.userId) ? ` (ID: \`${owlString(result.userId)}\`)` : ''}.`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a project user by email, external ID, or user ID. Returns the user's profile and wallet information.
If multiple query parameters are provided, only the first one in order (email, externalId, userId) is used.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('User email address to look up'),
      externalId: z.string().optional().describe('External identifier to look up'),
      userId: z.string().optional().describe('Owl Protocol user ID to look up'),
      chainId: z
        .number()
        .optional()
        .describe(
          'Chain ID for the user wallet. Defaults to the connection setting or the current project default from get_project.'
        )
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let lookup = userLookup(ctx.input);
    let chainId = ctx.input.chainId ?? ctx.config.chainId;
    if (chainId === undefined) {
      let project = await client.getProject();
      chainId = owlNumber(project.defaultChainId);
    }
    let result = await client.getUser({
      ...lookup,
      chainId: requireChainId(chainId)
    });

    return {
      output: {
        raw: result,
        userId: requireOwlString(
          result.userId === undefined ? result.id : result.userId,
          'user ID'
        ),
        email: requireOwlString(result.email, 'user email'),
        fullName: owlString(result.fullName),
        externalId: owlString(result.externalId),
        walletAddress: owlString(result.walletAddress) ?? owlString(result.safeAddress)
      },
      message: 'Retrieved project user profile.'
    };
  })
  .build();

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List a page of project user profiles. Call get_user with a chain ID to retrieve a user wallet address.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(listInputSchema)
  .output(
    z.object({
      raw: rawSchema,
      users: z
        .array(
          z.object({
            userId: z.string().optional().describe('User ID'),
            email: z.string().optional().describe('User email'),
            fullName: z.string().optional().describe('User full name'),
            externalId: z.string().optional().describe('External identifier'),
            walletAddress: z.string().optional().describe('User wallet address')
          })
        )
        .describe('List of project users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let users = await client.listUsers(ctx.input);

    let mapped = users.map(u => ({
      userId: requireOwlString(u.userId === undefined ? u.id : u.userId, 'user ID'),
      email: requireOwlString(u.email, 'user email'),
      fullName: owlString(u.fullName),
      externalId: owlString(u.externalId),
      walletAddress: owlString(u.walletAddress) ?? owlString(u.safeAddress)
    }));

    return {
      output: { users: mapped, raw: users },
      message: `Found **${mapped.length}** project user(s).`
    };
  })
  .build();
