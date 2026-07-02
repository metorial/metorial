import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let sealDocument = SlateTool.create(spec, {
  name: 'Seal Document (E-Seal)',
  key: 'seal_document',
  description: `Apply a corporate electronic seal (E-Seal) to documents using a machine-to-machine (M2M) emitter. E-Seals prove the origin and integrity of corporate documents without requiring individual signers.`,
  instructions: [
    'You need a valid M2M emitter ID configured in the Ignisign Console.',
    'Provide the document IDs and any required seal parameters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      m2mId: z.string().describe('M2M seal emitter ID'),
      documentIds: z.array(z.string()).optional().describe('Document IDs to seal'),
      title: z.string().optional().describe('Title for the seal request'),
      externalId: z.string().optional().describe('External ID for correlation')
    })
  )
  .output(
    z.object({
      m2mId: z.string().describe('M2M emitter ID used'),
      result: z.any().describe('Seal operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let sealData: Record<string, any> = {};
    if (ctx.input.documentIds) sealData.documentIds = ctx.input.documentIds;
    if (ctx.input.title) sealData.title = ctx.input.title;
    if (ctx.input.externalId) sealData.externalId = ctx.input.externalId;

    let result = await client.signM2M(ctx.input.m2mId, sealData);

    return {
      output: {
        m2mId: ctx.input.m2mId,
        result
      },
      message: `E-Seal applied successfully using M2M emitter **${ctx.input.m2mId}**.`
    };
  })
  .build();
