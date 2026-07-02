import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMobileWorker = SlateTool.create(spec, {
  name: 'Create or Update Mobile Worker',
  key: 'manage_mobile_worker',
  description: `Create a new mobile worker or update an existing one. Mobile workers are field users who collect data via the CommCare mobile app.
To create, provide a username and password. To update, provide the userId of an existing worker along with the fields to change.`,
  instructions: [
    'To create a new mobile worker, omit userId and provide username and password.',
    'To update an existing worker, provide the userId. Only include fields you want to change.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('ID of an existing mobile worker to update. Omit to create a new worker.'),
      username: z
        .string()
        .optional()
        .describe('Username for the new worker (required for creation)'),
      password: z
        .string()
        .optional()
        .describe('Password for the worker (required for creation)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phoneNumbers: z.array(z.string()).optional().describe('List of phone numbers'),
      groups: z
        .array(z.string())
        .optional()
        .describe('List of group IDs to assign the worker to'),
      userData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom user data as key-value pairs')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      username: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      created: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let isUpdate = !!ctx.input.userId;

    if (isUpdate) {
      let result = await client.updateMobileWorker(ctx.input.userId!, {
        first_name: ctx.input.firstName,
        last_name: ctx.input.lastName,
        email: ctx.input.email,
        phone_numbers: ctx.input.phoneNumbers,
        groups: ctx.input.groups,
        user_data: ctx.input.userData,
        password: ctx.input.password
      });

      return {
        output: {
          userId: result.id,
          username: result.username,
          firstName: result.first_name,
          lastName: result.last_name,
          created: false
        },
        message: `Updated mobile worker **${result.username}**.`
      };
    } else {
      if (!ctx.input.username || !ctx.input.password) {
        throw new Error('Username and password are required to create a new mobile worker.');
      }

      let result = await client.createMobileWorker({
        username: ctx.input.username,
        password: ctx.input.password,
        first_name: ctx.input.firstName,
        last_name: ctx.input.lastName,
        email: ctx.input.email,
        phone_numbers: ctx.input.phoneNumbers,
        groups: ctx.input.groups,
        user_data: ctx.input.userData
      });

      return {
        output: {
          userId: result.id,
          username: result.username,
          firstName: result.first_name,
          lastName: result.last_name,
          created: true
        },
        message: `Created mobile worker **${result.username}**.`
      };
    }
  })
  .build();
