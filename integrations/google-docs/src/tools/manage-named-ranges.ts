import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDocsClient, type Request } from '../lib/client';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageNamedRanges = SlateTool.create(spec, {
  name: 'Manage Named Ranges',
  key: 'manage_named_ranges',
  description: `Creates or deletes named ranges in a Google Docs document. Named ranges act as bookmarks that allow referencing specific sections of a document for targeted updates or template operations.`,
  instructions: [
    'Named ranges are useful for marking sections of a document that need frequent updates',
    'Use with template merging to precisely target where content should be inserted',
    'Named ranges can be retrieved using the Get Document tool'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleDocsActionScopes.manageNamedRanges)
  .input(
    z.object({
      documentId: z.string().describe('ID of the document'),
      operations: z
        .array(
          z.discriminatedUnion('action', [
            z.object({
              action: z.literal('create'),
              name: z.string().describe('Name for the new named range'),
              startIndex: z.number().describe('Start position of the range (1-based)'),
              endIndex: z.number().describe('End position of the range (1-based, exclusive)')
            }),
            z.object({
              action: z.literal('delete'),
              namedRangeId: z.string().optional().describe('ID of the named range to delete'),
              name: z
                .string()
                .optional()
                .describe('Name of the named range to delete (alternative to namedRangeId)')
            })
          ])
        )
        .min(1)
        .describe('List of named range operations to perform')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the document'),
      operationsApplied: z.number().describe('Number of operations successfully applied'),
      createdRangeIds: z
        .array(z.string())
        .optional()
        .describe('IDs of newly created named ranges')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDocsClient({
      token: ctx.auth.token
    });

    let requests: Request[] = [];

    for (let op of ctx.input.operations) {
      if (op.action === 'create') {
        requests.push({
          createNamedRange: {
            name: op.name,
            range: {
              startIndex: op.startIndex,
              endIndex: op.endIndex
            }
          }
        });
      } else {
        if (!op.namedRangeId && !op.name) {
          throw new Error('Either namedRangeId or name must be provided for delete operation');
        }
        requests.push({
          deleteNamedRange: op.namedRangeId
            ? { namedRangeId: op.namedRangeId }
            : { name: op.name }
        });
      }
    }

    let response = await client.batchUpdate(ctx.input.documentId, requests);

    let createdRangeIds: string[] = [];
    for (let reply of response.replies) {
      if (reply.createNamedRange?.namedRangeId) {
        createdRangeIds.push(reply.createNamedRange.namedRangeId);
      }
    }

    return {
      output: {
        documentId: response.documentId,
        operationsApplied: requests.length,
        createdRangeIds: createdRangeIds.length > 0 ? createdRangeIds : undefined
      },
      message: `Applied **${requests.length} named range operation(s)** to document \`${response.documentId}\``
    };
  })
  .build();
