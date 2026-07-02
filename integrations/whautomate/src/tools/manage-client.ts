import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageClient = SlateTool.create(spec, {
  name: 'Manage Client',
  key: 'manage_client',
  description: `Create, update, or delete a client record. Clients represent customers who receive services such as appointments and class bookings.
Supports full profile information including name, phone, email, date of birth, gender, address, emergency contacts, and custom fields.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the client'),
      clientId: z.string().optional().describe('Client ID (required for update and delete)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      countryCode: z.string().optional().describe('Country code for phone (e.g., +1)'),
      email: z.string().optional().describe('Email address'),
      dateOfBirth: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
      gender: z.string().optional().describe('Gender'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/province'),
      zipCode: z.string().optional().describe('ZIP/postal code'),
      country: z.string().optional().describe('Country'),
      notes: z.string().optional().describe('Internal notes about the client'),
      locationId: z.string().optional().describe('Primary location ID'),
      emergencyContactName: z.string().optional().describe('Emergency contact name'),
      emergencyContactPhone: z.string().optional().describe('Emergency contact phone'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      clientId: z.string().optional().describe('ID of the client'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      email: z.string().optional().describe('Email address'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action, clientId, ...fields } = ctx.input;

    if (action === 'create') {
      let result = await client.createClient(fields);
      return {
        output: {
          clientId: result.id || result._id,
          firstName: result.firstName,
          lastName: result.lastName,
          phone: result.phone,
          email: result.email,
          success: true
        },
        message: `Created client **${result.firstName || ''} ${result.lastName || ''}**.`
      };
    }

    if (action === 'update') {
      if (!clientId) throw new Error('clientId is required for update');
      let result = await client.updateClient(clientId, fields);
      return {
        output: {
          clientId: result.id || result._id || clientId,
          firstName: result.firstName,
          lastName: result.lastName,
          phone: result.phone,
          email: result.email,
          success: true
        },
        message: `Updated client **${clientId}**.`
      };
    }

    if (action === 'delete') {
      if (!clientId) throw new Error('clientId is required for delete');
      await client.deleteClient(clientId);
      return {
        output: {
          clientId,
          success: true
        },
        message: `Deleted client **${clientId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
