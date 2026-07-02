import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let placementTestCompleted = SlateTrigger.create(spec, {
  name: 'Placement Test Completed',
  key: 'placement_test_completed',
  description:
    'Triggers when a candidate completes a placement test. The callback URL must be set per invitation using the Send Test Invitation tool.'
})
  .input(
    z.object({
      invitationId: z.string().describe('ID of the test invitation'),
      candidateName: z.string().describe('Name of the candidate'),
      candidateEmail: z.string().describe('Email of the candidate'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier if provided when creating the invitation'),
      cefrLevel: z.string().describe('Final CEFR level label (e.g., B2 High)'),
      levelCode: z.string().describe('Machine-readable CEFR level code (e.g., B2H)'),
      rating: z.number().describe('Numeric rating mapped to 16 fine-grained CEFR sub-levels'),
      readingScore: z.number().optional().describe('Reading section score if included'),
      listeningScore: z.number().optional().describe('Listening section score if included'),
      completedAt: z.string().describe('Timestamp when the test was completed'),
      publicResultsUrl: z
        .string()
        .optional()
        .describe('Public results page URL for the candidate'),
      adminResultsUrl: z
        .string()
        .optional()
        .describe('Admin results page URL for embedding via iframe')
    })
  )
  .output(
    z.object({
      invitationId: z.string().describe('ID of the test invitation'),
      candidateName: z.string().describe('Name of the candidate'),
      candidateEmail: z.string().describe('Email of the candidate'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier if provided when creating the invitation'),
      cefrLevel: z.string().describe('Final CEFR level label (e.g., B2 High)'),
      levelCode: z.string().describe('Machine-readable CEFR level code (e.g., B2H)'),
      rating: z.number().describe('Numeric rating mapped to 16 fine-grained CEFR sub-levels'),
      readingScore: z.number().optional().describe('Reading section score if included'),
      listeningScore: z.number().optional().describe('Listening section score if included'),
      completedAt: z.string().describe('Timestamp when the test was completed'),
      publicResultsUrl: z
        .string()
        .optional()
        .describe('Public results page URL for the candidate'),
      adminResultsUrl: z
        .string()
        .optional()
        .describe('Admin results page URL for embedding via iframe')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      return {
        inputs: [
          {
            invitationId: data.invitationId ?? data.id ?? '',
            candidateName: data.candidateName ?? '',
            candidateEmail: data.candidateEmail ?? '',
            externalId: data.externalId,
            cefrLevel: data.cefrLevel ?? data.level ?? '',
            levelCode: data.levelCode ?? '',
            rating: data.rating ?? 0,
            readingScore: data.readingScore,
            listeningScore: data.listeningScore,
            completedAt: data.completedAt ?? data.completionTimestamp ?? '',
            publicResultsUrl: data.publicResultsUrl,
            adminResultsUrl: data.adminResultsUrl
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'placement_test.completed',
        id: ctx.input.invitationId,
        output: {
          invitationId: ctx.input.invitationId,
          candidateName: ctx.input.candidateName,
          candidateEmail: ctx.input.candidateEmail,
          externalId: ctx.input.externalId,
          cefrLevel: ctx.input.cefrLevel,
          levelCode: ctx.input.levelCode,
          rating: ctx.input.rating,
          readingScore: ctx.input.readingScore,
          listeningScore: ctx.input.listeningScore,
          completedAt: ctx.input.completedAt,
          publicResultsUrl: ctx.input.publicResultsUrl,
          adminResultsUrl: ctx.input.adminResultsUrl
        }
      };
    }
  })
  .build();
