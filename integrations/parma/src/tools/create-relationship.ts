import { SlateTool } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { spec } from '../spec';

export let createRelationship = SlateTool.create(spec, {
  name: 'Create Relationship',
  key: 'create_relationship',
  description: `Create a new relationship (contact) in Parma CRM. Use this to add a new customer, partner, or any person you want to track in your relationship management system. You can include their contact details and an initial note.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the person'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      company: z.string().optional().describe('Company or organization name'),
      title: z.string().optional().describe('Job title or role'),
      notes: z.string().optional().describe('Initial notes about this relationship')
    })
  )
  .output(
    z.object({
      relationshipId: z.string().describe('Unique ID of the created relationship'),
      name: z.string().describe('Name of the person'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      company: z.string().optional().describe('Company or organization'),
      title: z.string().optional().describe('Job title or role'),
      createdAt: z.string().optional().describe('Timestamp when the relationship was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ParmaClient(ctx.auth.token);

    let result = await client.createRelationship({
      name: ctx.input.name,
      email: ctx.input.email,
      phone: ctx.input.phone,
      company: ctx.input.company,
      title: ctx.input.title,
      notes: ctx.input.notes
    });

    return {
      output: {
        relationshipId: String(result.id),
        name: result.name ?? ctx.input.name,
        email: result.email ?? ctx.input.email,
        phone: result.phone ?? ctx.input.phone,
        company: result.company ?? ctx.input.company,
        title: result.title ?? ctx.input.title,
        createdAt: result.created_at
      },
      message: `Created relationship for **${ctx.input.name}**${ctx.input.company ? ` at ${ctx.input.company}` : ''}.`
    };
  })
  .build();
