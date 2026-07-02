import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createClient = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description: `Create a new client lead in Bonsai. Add contact details including name, email, company, phone, job title, and notes to build your CRM.`,
  instructions: [
    'Provide at least a **name** or **email** to create the client.',
    'Use **firstName** and **lastName** for individual contacts, or **name** for a general contact name.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Full name of the client contact'),
      firstName: z.string().optional().describe('First name of the client contact'),
      lastName: z.string().optional().describe('Last name of the client contact'),
      email: z.string().optional().describe('Email address of the client'),
      companyName: z.string().optional().describe('Company or organization name'),
      website: z.string().optional().describe('Client website URL'),
      phone: z.string().optional().describe('Phone number'),
      jobTitle: z.string().optional().describe('Job title of the client contact'),
      notes: z.string().optional().describe('Additional notes about the client')
    })
  )
  .output(
    z.object({
      clientId: z.string().describe('ID of the created client'),
      name: z.string().optional().describe('Full name of the client'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      companyName: z.string().optional().describe('Company name'),
      website: z.string().optional().describe('Website URL'),
      phone: z.string().optional().describe('Phone number'),
      jobTitle: z.string().optional().describe('Job title'),
      notes: z.string().optional().describe('Notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createClient({
      name: ctx.input.name,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      companyName: ctx.input.companyName,
      website: ctx.input.website,
      phone: ctx.input.phone,
      jobTitle: ctx.input.jobTitle,
      notes: ctx.input.notes
    });

    let displayName =
      result.name ||
      [result.firstName, result.lastName].filter(Boolean).join(' ') ||
      result.email ||
      'Unknown';

    return {
      output: {
        clientId: result.id,
        name: result.name,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        companyName: result.companyName,
        website: result.website,
        phone: result.phone,
        jobTitle: result.jobTitle,
        notes: result.notes
      },
      message: `Created client **${displayName}** (\`${result.id}\`).`
    };
  })
  .build();
