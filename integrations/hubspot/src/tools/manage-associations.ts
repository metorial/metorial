import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let createAssociation = SlateTool.create(spec, {
  name: 'Create Association',
  key: 'create_association',
  description: `Create an association (relationship) between two CRM objects in HubSpot. Common associations include contact-to-company, deal-to-contact, and ticket-to-company.`,
  instructions: [
    'Common association type IDs: contact→company=279, company→contact=280, deal→contact=3, contact→deal=4, deal→company=341, company→deal=342, ticket→contact=15, contact→ticket=16.',
    'Use associationCategory "HUBSPOT_DEFINED" for standard association types.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.createAssociation)
  .input(
    z.object({
      fromObjectType: z
        .string()
        .describe('Source object type (e.g., contacts, companies, deals, tickets)'),
      fromObjectId: z.string().describe('Source object ID'),
      toObjectType: z.string().describe('Target object type'),
      toObjectId: z.string().describe('Target object ID'),
      associationTypeId: z.number().describe('Association type ID defining the relationship'),
      associationCategory: z
        .string()
        .default('HUBSPOT_DEFINED')
        .describe('Association category (e.g., HUBSPOT_DEFINED, USER_DEFINED)')
    })
  )
  .output(
    z.object({
      fromObjectType: z.string().describe('Source object type'),
      fromObjectId: z.string().describe('Source object ID'),
      toObjectType: z.string().describe('Target object type'),
      toObjectId: z.string().describe('Target object ID'),
      labels: z.array(z.string()).optional().describe('Association labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.createAssociation(
      ctx.input.fromObjectType,
      ctx.input.fromObjectId,
      ctx.input.toObjectType,
      ctx.input.toObjectId,
      ctx.input.associationTypeId,
      ctx.input.associationCategory
    );

    return {
      output: {
        fromObjectType: ctx.input.fromObjectType,
        fromObjectId: ctx.input.fromObjectId,
        toObjectType: ctx.input.toObjectType,
        toObjectId: ctx.input.toObjectId,
        labels: result?.labels || []
      },
      message: `Created association from ${ctx.input.fromObjectType}/${ctx.input.fromObjectId} to ${ctx.input.toObjectType}/${ctx.input.toObjectId}`
    };
  })
  .build();

export let getAssociations = SlateTool.create(spec, {
  name: 'Get Associations',
  key: 'get_associations',
  description: `Retrieve all associations of a specific type for a CRM object. For example, get all contacts associated with a company, or all deals associated with a contact.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getAssociations)
  .input(
    z.object({
      fromObjectType: z
        .string()
        .describe('Source object type (e.g., contacts, companies, deals, tickets)'),
      fromObjectId: z.string().describe('Source object ID'),
      toObjectType: z.string().describe('Target object type to retrieve associations for')
    })
  )
  .output(
    z.object({
      associations: z
        .array(
          z.object({
            toObjectId: z.string().describe('Associated object ID'),
            associationTypes: z
              .array(
                z.object({
                  category: z.string().optional().describe('Association category'),
                  typeId: z.number().optional().describe('Association type ID'),
                  label: z.string().optional().describe('Association label')
                })
              )
              .optional()
              .describe('Types of associations')
          })
        )
        .describe('List of associations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getAssociations(
      ctx.input.fromObjectType,
      ctx.input.fromObjectId,
      ctx.input.toObjectType
    );

    let associations = (result.results || []).map((r: any) => ({
      toObjectId: r.toObjectId ? String(r.toObjectId) : String(r.id || ''),
      associationTypes: (r.associationTypes || []).map((t: any) => ({
        category: t.category,
        typeId: t.typeId,
        label: typeof t.label === 'string' ? t.label : undefined
      }))
    }));

    return {
      output: { associations },
      message: `Found **${associations.length}** ${ctx.input.toObjectType} associated with ${ctx.input.fromObjectType}/${ctx.input.fromObjectId}`
    };
  })
  .build();

export let deleteAssociation = SlateTool.create(spec, {
  name: 'Delete Association',
  key: 'delete_association',
  description: `Remove an association between two CRM objects in HubSpot. This removes the relationship link without deleting the objects themselves.`,
  tags: { destructive: true, readOnly: false }
})
  .scopes(hubSpotActionScopes.deleteAssociation)
  .input(
    z.object({
      fromObjectType: z.string().describe('Source object type'),
      fromObjectId: z.string().describe('Source object ID'),
      toObjectType: z.string().describe('Target object type'),
      toObjectId: z.string().describe('Target object ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    await client.deleteAssociation(
      ctx.input.fromObjectType,
      ctx.input.fromObjectId,
      ctx.input.toObjectType,
      ctx.input.toObjectId
    );

    return {
      output: { success: true },
      message: `Removed association from ${ctx.input.fromObjectType}/${ctx.input.fromObjectId} to ${ctx.input.toObjectType}/${ctx.input.toObjectId}`
    };
  })
  .build();
