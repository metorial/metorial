import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Bonsai. Projects can be linked to a client and configured with currency, description, and notes.`,
  instructions: [
    'A **name** is required to create a project.',
    "Link the project to a client by providing the client's **email** via the clientEmail field."
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the project'),
      clientEmail: z
        .string()
        .optional()
        .describe('Email of the client to link this project to'),
      description: z.string().optional().describe('Project description'),
      notes: z.string().optional().describe('Additional notes for the project'),
      currency: z
        .string()
        .optional()
        .describe('Currency code for the project (e.g., "USD", "EUR")')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the created project'),
      name: z.string().describe('Name of the project'),
      clientId: z.string().optional().describe('ID of the linked client'),
      clientEmail: z.string().optional().describe('Email of the linked client'),
      description: z.string().optional().describe('Project description'),
      notes: z.string().optional().describe('Project notes'),
      currency: z.string().optional().describe('Currency code'),
      status: z.string().optional().describe('Project status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createProject({
      name: ctx.input.name,
      clientEmail: ctx.input.clientEmail,
      description: ctx.input.description,
      notes: ctx.input.notes,
      currency: ctx.input.currency
    });

    return {
      output: {
        projectId: result.id,
        name: result.name,
        clientId: result.clientId,
        clientEmail: result.clientEmail,
        description: result.description,
        notes: result.notes,
        currency: result.currency,
        status: result.status
      },
      message: `Created project **${result.name}** (\`${result.id}\`)${ctx.input.clientEmail ? ` linked to client ${ctx.input.clientEmail}` : ''}.`
    };
  })
  .build();
