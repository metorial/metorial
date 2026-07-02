import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listComparisons = SlateTool.create(spec, {
  name: 'List Comparisons',
  key: 'list_comparisons',
  description: `Lists all comparisons associated with your account, ordered from newest to oldest. Supports pagination via limit and offset parameters.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of comparisons to return'),
      offset: z.number().optional().describe('Number of comparisons to skip for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of comparisons available'),
      comparisons: z.array(
        z.object({
          comparisonIdentifier: z.string().describe('Unique identifier of the comparison'),
          left: z.object({
            fileType: z.string().describe('File type of the left document'),
            displayName: z.string().nullable().describe('Display name of the left document')
          }),
          right: z.object({
            fileType: z.string().describe('File type of the right document'),
            displayName: z.string().nullable().describe('Display name of the right document')
          }),
          isPublic: z.boolean().describe('Whether the comparison is publicly accessible'),
          creationTime: z.string().describe('UTC timestamp when the comparison was created'),
          expiryTime: z
            .string()
            .nullable()
            .describe('UTC timestamp when the comparison will expire'),
          ready: z.boolean().describe('Whether the comparison processing is complete'),
          failed: z.boolean().nullable().describe('Whether the comparison processing failed')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listComparisons({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        totalCount: result.count,
        comparisons: result.results.map(c => ({
          comparisonIdentifier: c.identifier,
          left: {
            fileType: c.left.fileType,
            displayName: c.left.displayName
          },
          right: {
            fileType: c.right.fileType,
            displayName: c.right.displayName
          },
          isPublic: c.isPublic,
          creationTime: c.creationTime,
          expiryTime: c.expiryTime,
          ready: c.ready,
          failed: c.failed
        }))
      },
      message: `Found **${result.count}** comparison(s). Returned ${result.results.length} result(s).`
    };
  })
  .build();
