import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createClient = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description:
    'Create a Project Bubble client that can be associated with projects and contacts.'
})
  .input(
    z.object({
      clientName: z.string().describe('Client name'),
      contactId: z
        .string()
        .optional()
        .describe('Primary contact ID. Call list_contacts to discover contacts.'),
      email: z.string().optional().describe('Email address'),
      tel: z.string().optional().describe('Telephone number'),
      mobile: z.string().optional().describe('Mobile number'),
      website: z.string().optional().describe('Client website'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      postcode: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country'),
      background: z.string().optional().describe('Client background information')
    })
  )
  .output(
    z.object({
      clientId: z.string().describe('Created client ID'),
      clientName: z.string().describe('Client name')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.clientName.trim()) {
      throw createApiServiceError('Enter a non-empty client name.', {
        reason: 'missing_client_name'
      });
    }
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain ?? ctx.config.domain
    });
    let result = await client.createClient(ctx.input);
    let record = result?.data?.[0] || result?.data || result;
    if (!record?.client_id) {
      throw createApiServiceError('Project Bubble did not return the created client ID.', {
        reason: 'missing_created_client'
      });
    }
    return {
      output: {
        clientId: String(record.client_id),
        clientName: record.client_name || ctx.input.clientName
      },
      message: `Created client **${record.client_name || ctx.input.clientName}**.`
    };
  })
  .build();
