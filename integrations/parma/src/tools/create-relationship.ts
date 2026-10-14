import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { mapRelationship, relationshipSchema } from '../lib/relationship';
import { spec } from '../spec';

export let createRelationship = SlateTool.create(spec, {
  name: 'Create Relationship',
  key: 'create_relationship',
  description: `Create a new relationship (contact) in Parma CRM. Use this to add a new customer, partner, or any person you want to track in your relationship management system. Call list_groups first, then provide groupIds to choose where the relationship belongs. You can include background notes and link a person to an existing company.`,
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
      notes: z
        .string()
        .optional()
        .describe('Initial background notes, saved in the relationship about field'),
      groupIds: z
        .array(z.number().int().positive())
        .optional()
        .describe(
          'Group IDs. Call list_groups to discover IDs; at least one is required by Parma'
        ),
      type: z
        .enum(['person', 'company'])
        .optional()
        .describe('Relationship type; defaults to person'),
      companyId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Company relationship ID for a person. Call search_relationships with type company to discover IDs'
        )
    })
  )
  .output(relationshipSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.groupIds?.length) {
      throw createApiServiceError(
        'Parma requires at least one group ID. Call list_groups and provide groupIds.'
      );
    }
    if (ctx.input.type === 'company' && ctx.input.companyId !== undefined) {
      throw createApiServiceError(
        'Only a person can be linked to companyId. Omit companyId when creating a company.'
      );
    }
    let client = new ParmaClient(ctx.auth.token);

    let result = await client.createRelationship({
      name: ctx.input.name,
      email: ctx.input.email,
      phone: ctx.input.phone,
      company: ctx.input.company,
      title: ctx.input.title,
      notes: ctx.input.notes,
      groupIds: ctx.input.groupIds,
      type: ctx.input.type,
      companyId: ctx.input.companyId
    });

    return {
      output: mapRelationship(result),
      message: `Created relationship for **${result.name}**.`
    };
  })
  .build();
