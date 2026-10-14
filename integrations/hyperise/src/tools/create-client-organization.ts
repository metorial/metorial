import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createClientOrganization = SlateTool.create(spec, {
  name: 'Create Client Organization',
  key: 'create_client_organization',
  description:
    'Create a Hyperise client sub-account, allocate seats, and invite the client by email. Requires an Agency or White Label plan.',
  constraints: ['Only available on Hyperise Agency and White Label plans.']
})
  .input(
    z.object({
      clientName: z.string().describe('Name of the client organization'),
      clientEmail: z.string().describe('Email address that receives the client invitation'),
      seats: z.number().describe('Number of seats allocated to the client organization')
    })
  )
  .output(
    z
      .object({
        clientId: z.string().describe('ID of the created client organization'),
        clientName: z.string().describe('Name of the created client organization'),
        createdAt: z.string().optional().describe('Creation timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    if (!Number.isInteger(ctx.input.seats) || ctx.input.seats < 1) {
      throw createApiServiceError('Provide a positive whole number of client seats.');
    }
    if (!ctx.input.clientName.trim() || !ctx.input.clientEmail.trim()) {
      throw createApiServiceError(
        'Provide the client organization name and invitation email.'
      );
    }

    let result = await new Client({ token: ctx.auth.token }).createClientOrganization({
      name: ctx.input.clientName,
      email: ctx.input.clientEmail,
      seats: ctx.input.seats
    });
    let account = result?.data ?? result;
    if (
      !isApiErrorRecord(account) ||
      (typeof account.id !== 'string' && typeof account.id !== 'number')
    ) {
      throw createApiServiceError('Hyperise returned a client organization without an ID.');
    }

    return {
      output: {
        ...account,
        clientId: String(account.id),
        clientName: typeof account.name === 'string' ? account.name : ctx.input.clientName,
        createdAt: typeof account.created_at === 'string' ? account.created_at : undefined
      },
      message: `Created client organization **${ctx.input.clientName}** and invited ${ctx.input.clientEmail}.`
    };
  })
  .build();
