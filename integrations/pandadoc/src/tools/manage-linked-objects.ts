import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { pandadocServiceError } from '../lib/errors';
import { spec } from '../spec';

export let linkCrmObject = SlateTool.create(spec, {
  name: 'Link CRM Object',
  key: 'link_crm_object',
  description: `Link a PandaDoc document to an external CRM object (e.g., Salesforce opportunity, HubSpot deal). Also supports listing and removing existing links.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document'),
      action: z.enum(['link', 'list', 'unlink']).describe('Action to perform'),
      provider: z
        .string()
        .optional()
        .describe(
          'CRM provider name (e.g., "salesforce", "hubspot"). Required for link action.'
        ),
      entityType: z
        .string()
        .optional()
        .describe('CRM entity type (e.g., "opportunity", "deal"). Required for link action.'),
      entityId: z.string().optional().describe('CRM entity ID. Required for link action.'),
      linkedObjectId: z
        .string()
        .optional()
        .describe('PandaDoc linked object ID. Required for unlink action.')
    })
  )
  .output(
    z.object({
      linkedObjects: z
        .array(
          z.object({
            linkedObjectId: z.string().describe('PandaDoc linked object UUID'),
            provider: z.string().optional().describe('CRM provider'),
            entityType: z.string().optional().describe('CRM entity type'),
            entityId: z.string().optional().describe('CRM entity ID')
          })
        )
        .optional()
        .describe('List of linked objects (returned for link and list actions)'),
      unlinked: z.boolean().optional().describe('Whether the unlink was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    if (ctx.input.action === 'link') {
      if (!ctx.input.provider || !ctx.input.entityType || !ctx.input.entityId) {
        throw pandadocServiceError(
          'provider, entityType, and entityId are required for link action.'
        );
      }

      let result = await client.createLinkedObject(ctx.input.documentId, {
        provider: ctx.input.provider,
        entity_type: ctx.input.entityType,
        entity_id: ctx.input.entityId
      });

      return {
        output: {
          linkedObjects: [
            {
              linkedObjectId: result.id,
              provider: result.provider || ctx.input.provider,
              entityType: result.entity_type || ctx.input.entityType,
              entityId: result.entity_id || ctx.input.entityId
            }
          ]
        },
        message: `Linked document \`${ctx.input.documentId}\` to ${ctx.input.provider} ${ctx.input.entityType} \`${ctx.input.entityId}\`.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listLinkedObjects(ctx.input.documentId);
      let objects = (result.results || result || []).map((obj: any) => ({
        linkedObjectId: obj.id,
        provider: obj.provider,
        entityType: obj.entity_type,
        entityId: obj.entity_id
      }));

      return {
        output: { linkedObjects: objects },
        message: `Found **${objects.length}** linked object(s) on document \`${ctx.input.documentId}\`.`
      };
    }

    if (ctx.input.action === 'unlink') {
      if (!ctx.input.linkedObjectId) {
        throw pandadocServiceError('linkedObjectId is required for unlink action.');
      }

      await client.deleteLinkedObject(ctx.input.documentId, ctx.input.linkedObjectId);

      return {
        output: { unlinked: true },
        message: `Unlinked object \`${ctx.input.linkedObjectId}\` from document \`${ctx.input.documentId}\`.`
      };
    }

    throw pandadocServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
