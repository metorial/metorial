import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List all files in a user's document bucket for a specific flow and node. Returns the filenames stored in the bucket.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      flowId: z.string().describe('The flow ID containing the document node'),
      nodeId: z.string().describe('The document node ID within the flow'),
      userId: z.string().describe('The user ID that owns the document bucket')
    })
  )
  .output(
    z.object({
      filenames: z.array(z.string()).describe('List of filenames in the document bucket')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let files = await client.listDocuments(
      ctx.input.flowId,
      ctx.input.nodeId,
      ctx.input.userId
    );

    return {
      output: {
        filenames: files
      },
      message: `Found **${files.length}** file(s) in the document bucket.`
    };
  })
  .build();

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Delete a file from a user's document bucket associated with a specific flow and node.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      flowId: z.string().describe('The flow ID containing the document node'),
      nodeId: z.string().describe('The document node ID within the flow'),
      userId: z.string().describe('The user ID that owns the document bucket'),
      filename: z.string().describe('The name of the file to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the file was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    await client.deleteDocument(
      ctx.input.flowId,
      ctx.input.nodeId,
      ctx.input.userId,
      ctx.input.filename
    );

    return {
      output: {
        deleted: true
      },
      message: `Deleted file **${ctx.input.filename}** from the document bucket.`
    };
  })
  .build();
