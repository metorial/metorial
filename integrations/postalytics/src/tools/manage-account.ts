import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let manageAccount = SlateTool.create(spec, {
  name: 'Manage Account',
  key: 'manage_account',
  description: `Retrieve, create, update, or delete Postalytics accounts. Supports viewing your own account, getting sub-account details, creating new sub-accounts for multi-tenant setups, and retrieving active integrations.`,
  instructions: [
    'Use action "me" to get your own account details.',
    'Use action "get" to retrieve a specific sub-account by ID.',
    'Use action "create" to create a new sub-account (for Agency Edition multi-tenant use).',
    'Use action "update" to modify account fields.',
    'Use action "delete" to remove a sub-account.',
    'Use action "integrations" to list active integrations.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['me', 'get', 'create', 'update', 'delete', 'integrations'])
        .describe('The action to perform'),
      accountId: z.string().optional().describe('Account ID (required for get, delete)'),
      username: z
        .string()
        .optional()
        .describe('Username for new account (required for create)'),
      password: z
        .string()
        .optional()
        .describe('Password for new account (required for create)'),
      firstName: z.string().optional().describe('First name (required for create)'),
      lastName: z.string().optional().describe('Last name (required for create)'),
      emailAddress: z.string().optional().describe('Email address'),
      company: z.string().optional().describe('Company name'),
      phone: z.string().optional().describe('Phone number'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP code')
    })
  )
  .output(
    z.object({
      account: z.record(z.string(), z.unknown()).optional().describe('Account details'),
      integrations: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Active integrations; array responses are preserved under data'),
      result: z.record(z.string(), z.unknown()).optional().describe('Operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'me') {
      let account = await client.getMyAccount();
      return {
        output: { account },
        message: 'Retrieved your account details.'
      };
    }

    if (action === 'get') {
      if (!ctx.input.accountId)
        throw createApiServiceError('accountId is required for get action');
      let account = await client.getAccount(ctx.input.accountId);
      return {
        output: { account },
        message: `Retrieved account **${ctx.input.accountId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.username)
        throw createApiServiceError('username is required for create action');
      if (!ctx.input.password)
        throw createApiServiceError('password is required for create action');
      if (!ctx.input.firstName)
        throw createApiServiceError('firstName is required for create action');
      if (!ctx.input.lastName)
        throw createApiServiceError('lastName is required for create action');
      let result = await client.createAccount({
        username: ctx.input.username,
        password: ctx.input.password,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        emailAddress: ctx.input.emailAddress,
        company: ctx.input.company,
        phone: ctx.input.phone,
        address: ctx.input.address,
        city: ctx.input.city,
        state: ctx.input.state,
        zip: ctx.input.zip
      });
      return {
        output: { result },
        message: `Account created for **${ctx.input.firstName} ${ctx.input.lastName}**.`
      };
    }

    if (action === 'update') {
      let updateParams: Record<string, unknown> = {};
      if (ctx.input.username !== undefined) updateParams.username = ctx.input.username;
      if (ctx.input.password !== undefined) updateParams.password = ctx.input.password;
      if (ctx.input.firstName !== undefined) updateParams.first_name = ctx.input.firstName;
      if (ctx.input.lastName !== undefined) updateParams.last_name = ctx.input.lastName;
      if (ctx.input.emailAddress !== undefined)
        updateParams.email_address = ctx.input.emailAddress;
      if (ctx.input.company !== undefined) updateParams.company = ctx.input.company;
      if (ctx.input.phone !== undefined) updateParams.phone = ctx.input.phone;

      if (ctx.input.address !== undefined) updateParams.address_street = ctx.input.address;
      if (ctx.input.city !== undefined) updateParams.address_city = ctx.input.city;
      if (ctx.input.state !== undefined) updateParams.address_state = ctx.input.state;
      if (ctx.input.zip !== undefined) updateParams.address_zip = ctx.input.zip;

      let result = await client.updateAccount(updateParams);
      return {
        output: { result },
        message: 'Account updated successfully.'
      };
    }

    if (action === 'delete') {
      if (!ctx.input.accountId)
        throw createApiServiceError('accountId is required for delete action');
      let result = await client.deleteAccount(ctx.input.accountId);
      return {
        output: { result },
        message: `Account **${ctx.input.accountId}** deleted.`
      };
    }

    if (action === 'integrations') {
      let integrations = await client.getIntegrations();
      return {
        output: { integrations },
        message: 'Retrieved active integrations.'
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
