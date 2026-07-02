import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAgreementMembers = SlateTool.create(spec, {
  name: 'Get Agreement Members',
  key: 'get_agreement_members',
  description: `Retrieve sender, participant set, next participant, CC, and share information for an Adobe Acrobat Sign agreement. Use this to find participant IDs needed for reminders or recipient-level operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agreementId: z.string().describe('ID of the agreement whose members should be retrieved')
    })
  )
  .output(
    z.object({
      agreementId: z.string().describe('ID of the agreement'),
      senderInfo: z.any().optional().describe('Sender information'),
      participantSets: z.array(z.any()).describe('All participant sets on the agreement'),
      nextParticipantSets: z
        .array(z.any())
        .describe('Participant sets currently expected to act next'),
      ccsInfo: z.array(z.any()).describe('CC participants on the agreement'),
      sharesInfo: z.array(z.any()).describe('Agreement share participants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.getAgreementMembers(ctx.input.agreementId);
    let participantSets = result.participantSets || [];
    let nextParticipantSets = result.nextParticipantSets || [];

    return {
      output: {
        agreementId: ctx.input.agreementId,
        senderInfo: result.senderInfo,
        participantSets,
        nextParticipantSets,
        ccsInfo: result.ccsInfo || [],
        sharesInfo: result.sharesInfo || []
      },
      message: `Agreement \`${ctx.input.agreementId}\` has **${participantSets.length}** participant set(s) and **${nextParticipantSets.length}** next participant set(s).`
    };
  });
