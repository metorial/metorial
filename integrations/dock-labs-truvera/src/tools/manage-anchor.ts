import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let manageAnchor = SlateTool.create(spec, {
  name: 'Manage Anchor',
  key: 'manage_anchor',
  description: `Create, retrieve, list, or verify blockchain anchors. Anchors attest that one or more document hashes were created at a specific time on the Dock blockchain.
Multiple documents can be batched into a single anchor via a Merkle tree to save cost.`,
  instructions: [
    'To create an anchor, provide document strings/hashes. The API stores blake2b256 hashes of provided documents.',
    'To verify an anchor, provide the anchorId and the original documents to check against the Merkle root.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'verify']).describe('Operation to perform'),
      anchorId: z.string().optional().describe('Anchor ID (required for get and verify)'),
      documents: z
        .array(z.string())
        .optional()
        .describe('Document strings or hashes to anchor or verify against'),
      offset: z.number().optional().describe('Pagination offset for list'),
      limit: z.number().optional().describe('Maximum number of results for list')
    })
  )
  .output(
    z.object({
      anchor: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The anchor document with root hash and proofs'),
      anchors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of anchors'),
      verified: z.boolean().optional().describe('Whether the anchor verification passed'),
      verificationResult: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Detailed verification result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.documents || ctx.input.documents.length === 0) {
          throw new Error('documents is required for create action');
        }
        let result = await client.createAnchor(ctx.input.documents);
        return {
          output: { anchor: result },
          message: `Created anchor for **${ctx.input.documents.length}** document(s)`
        };
      }
      case 'get': {
        if (!ctx.input.anchorId) throw new Error('anchorId is required for get action');
        let result = await client.getAnchor(ctx.input.anchorId);
        return {
          output: { anchor: result },
          message: `Retrieved anchor **${ctx.input.anchorId}**`
        };
      }
      case 'list': {
        let results = await client.listAnchors({
          offset: ctx.input.offset,
          limit: ctx.input.limit
        });
        return {
          output: { anchors: results },
          message: `Found **${results.length}** anchor(s)`
        };
      }
      case 'verify': {
        if (!ctx.input.anchorId) throw new Error('anchorId is required for verify action');
        if (!ctx.input.documents || ctx.input.documents.length === 0) {
          throw new Error('documents is required for verify action');
        }
        let result = await client.verifyAnchor(ctx.input.anchorId, ctx.input.documents);
        let verified = (result.verified === true) as boolean;
        return {
          output: {
            verified,
            verificationResult: result
          },
          message: verified
            ? `✅ Anchor **${ctx.input.anchorId}** verification **passed**`
            : `❌ Anchor **${ctx.input.anchorId}** verification **failed**`
        };
      }
    }
  })
  .build();
