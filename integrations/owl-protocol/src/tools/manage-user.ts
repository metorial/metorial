import { SlateTool } from 'slates';
import { z } from 'zod';
import { OwlClient } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string().optional().describe('Owl Protocol user ID'),
  email: z.string().optional().describe('User email address'),
  fullName: z.string().optional().describe('User full name'),
  externalId: z.string().optional().describe('External identifier'),
  walletAddress: z.string().optional().describe('User wallet address')
});

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new project user who receives a universal wallet for interacting with your project's digital assets.
Users can be identified by email, and each user gets a single universal wallet that works across all blockchains.`,
  instructions: [
    'Each user gets a universal wallet automatically - no private keys or crypto needed.',
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

    let result = await client.createUser({
      email: ctx.input.email,
      fullName: ctx.input.fullName,
      externalId: ctx.input.externalId
    });

    return {
      output: {
        userId: result.userId ?? result.id,
        email: result.email,
        fullName: result.fullName,
        externalId: result.externalId,
        walletAddress: result.walletAddress ?? result.safeAddress
      },
      message: `Created user **${ctx.input.email}**${result.userId ? ` (ID: \`${result.userId}\`)` : ''}.`
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
        .describe('Chain ID to include chain-specific wallet information')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let result = await client.getUser({
      email: ctx.input.email,
      externalId: ctx.input.externalId,
      userId: ctx.input.userId,
      chainId: ctx.input.chainId ?? ctx.config.chainId
    });

    return {
      output: {
        userId: result.userId ?? result.id,
        email: result.email,
        fullName: result.fullName,
        externalId: result.externalId,
        walletAddress: result.walletAddress ?? result.safeAddress
      },
      message: `Retrieved user **${result.email ?? result.userId ?? result.id}**.`
    };
  })
  .build();

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all project users. Returns user profiles and wallet information for each user in the project.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
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

    let result = await client.listUsers();
    let users = Array.isArray(result) ? result : (result.items ?? []);

    let mapped = users.map(
      (u: {
        userId?: string;
        id?: string;
        email?: string;
        fullName?: string;
        externalId?: string;
        walletAddress?: string;
        safeAddress?: string;
      }) => ({
        userId: u.userId ?? u.id,
        email: u.email,
        fullName: u.fullName,
        externalId: u.externalId,
        walletAddress: u.walletAddress ?? u.safeAddress
      })
    );

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** project user(s).`
    };
  })
  .build();
