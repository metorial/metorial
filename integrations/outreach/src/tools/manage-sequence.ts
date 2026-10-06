import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buildRelationship,
  cleanAttributes,
  flattenResource,
  mergeRelationships,
  validateInput
} from '../lib/helpers';
import { spec } from '../spec';

export let manageSequence = SlateTool.create(spec, {
  name: 'Manage Sequence',
  key: 'manage_sequence',
  description: `Create or update a sequence (automated outreach campaign) in Outreach.
Sequences are multi-step campaigns that automate prospect engagement through emails, calls, and tasks.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      sequenceId: z.string().optional().describe('Sequence ID (required for update)'),
      name: z.string().optional().describe('Sequence name'),
      description: z.string().optional().describe('Description of the sequence'),
      sequenceType: z
        .enum(['interval', 'date'])
        .optional()
        .describe('Type: "interval" (days between steps) or "date" (specific dates)'),
      enabled: z
        .boolean()
        .optional()
        .describe(
          'Activate or deactivate the sequence through its supported lifecycle action. Activation may start automation for enrolled prospects.'
        ),
      tags: z.array(z.string()).optional().describe('Tags'),
      ownerId: z.string().optional().describe('User ID of the sequence owner')
    })
  )
  .output(
    z.object({
      sequenceId: z.string(),
      name: z.string().optional(),
      enabled: z.boolean().optional(),
      sequenceType: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let attributes = cleanAttributes({
      name: ctx.input.name,
      description: ctx.input.description,
      sequenceType: ctx.input.sequenceType,
      tags: ctx.input.tags
    });

    let relationships = mergeRelationships(buildRelationship('owner', ctx.input.ownerId));

    if (ctx.input.action === 'create') {
      if (!ctx.input.name?.trim())
        throw createApiServiceError('Name is required for sequence creation.');
      let resource = await client.createSequence(attributes, relationships);
      if (ctx.input.enabled !== undefined && resource.attributes.enabled !== ctx.input.enabled)
        resource = await client.action(
          'sequences',
          resource.id,
          ctx.input.enabled ? 'activate' : 'deactivate'
        );
      let flat = flattenResource(resource);
      return {
        output: {
          sequenceId: flat.id,
          name: flat.name,
          enabled: flat.enabled,
          sequenceType: flat.sequenceType,
          createdAt: flat.createdAt,
          updatedAt: flat.updatedAt
        },
        message: `Sequence **${flat.name ?? flat.id}** created with ID ${flat.id}.`
      };
    }

    if (!ctx.input.sequenceId)
      throw createApiServiceError('sequenceId is required for update');
    if (!Object.keys(attributes).length && !relationships && ctx.input.enabled === undefined)
      throw createApiServiceError('Provide at least one field to update.');
    let resource =
      Object.keys(attributes).length || relationships
        ? await client.updateSequence(ctx.input.sequenceId, attributes, relationships)
        : await client.getSequence(ctx.input.sequenceId);
    if (ctx.input.enabled !== undefined && resource.attributes.enabled !== ctx.input.enabled)
      resource = await client.action(
        'sequences',
        resource.id,
        ctx.input.enabled ? 'activate' : 'deactivate'
      );
    let flat = flattenResource(resource);
    return {
      output: {
        sequenceId: flat.id,
        name: flat.name,
        enabled: flat.enabled,
        sequenceType: flat.sequenceType,
        createdAt: flat.createdAt,
        updatedAt: flat.updatedAt
      },
      message: `Sequence **${flat.name ?? flat.id}** (${flat.id}) updated successfully.`
    };
  })
  .build();
