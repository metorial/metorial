import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let listConnectors = SlateTool.create(spec, {
  name: 'List Connectors',
  key: 'list_connectors',
  description: `List all configured data source connectors. Connectors automatically sync and index content from external sources like Google Drive, SharePoint, Notion, Slack, and others into collections.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      connectors: z
        .array(
          z.object({
            connectorId: z.string().describe('Unique identifier of the connector'),
            name: z.string().describe('Name of the connector'),
            type: z
              .string()
              .describe('Type of the connector (e.g. google_drive, sharepoint, notion)'),
            collectionId: z.string().describe('ID of the collection this connector syncs to'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the connector was created'),
            updatedAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the connector was last updated'),
            status: z.string().optional().describe('Current sync status of the connector')
          })
        )
        .describe('List of configured connectors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let connectors = await client.listConnectors();

    let mapped = connectors.map(c => ({
      connectorId: c.id,
      name: c.name,
      type: c.type,
      collectionId: c.collection_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      status: c.status
    }));

    return {
      output: { connectors: mapped },
      message: `Found **${mapped.length}** connector(s).`
    };
  })
  .build();
