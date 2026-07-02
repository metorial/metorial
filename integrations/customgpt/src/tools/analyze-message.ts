import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let analyzeMessage = SlateTool.create(spec, {
  name: 'Analyze Message',
  key: 'analyze_message',
  description: `Analyze a specific message response from an AI agent. Retrieve trust scores, claims, verification results, or submit feedback. Use this to evaluate the quality and accuracy of agent responses.`,
  instructions: [
    'Use "trust_score" to get a confidence score for the response.',
    'Use "claims" to extract factual claims from the response.',
    'Use "verify" to verify the accuracy of the response.',
    'Use "feedback" to submit thumbs up/down feedback.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      analysisType: z
        .enum(['trust_score', 'claims', 'verify', 'feedback'])
        .describe('Type of analysis to perform'),
      projectId: z.number().describe('ID of the agent'),
      sessionId: z.string().describe('Session ID of the conversation'),
      promptId: z.number().describe('Prompt ID of the message to analyze'),
      feedback: z
        .string()
        .optional()
        .describe(
          'Feedback value (e.g. "thumbs_up", "thumbs_down") — required when analysisType is "feedback"'
        )
    })
  )
  .output(
    z.object({
      analysisType: z.string().describe('Type of analysis performed'),
      trustScore: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Trust/accuracy score data'),
      claims: z
        .array(z.record(z.string(), z.unknown()))
        .nullable()
        .describe('Claims extracted from the response'),
      verification: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Verification results'),
      feedbackSubmitted: z.boolean().nullable().describe('Whether feedback was submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });
    let { analysisType, projectId, sessionId, promptId } = ctx.input;

    if (analysisType === 'trust_score') {
      let score = await client.getMessageTrustScore(projectId, sessionId, promptId);
      return {
        output: {
          analysisType,
          trustScore: score,
          claims: null,
          verification: null,
          feedbackSubmitted: null
        },
        message: `Retrieved trust score for message **${promptId}**.`
      };
    }

    if (analysisType === 'claims') {
      let claims = await client.getMessageClaims(projectId, sessionId, promptId);
      return {
        output: {
          analysisType,
          trustScore: null,
          claims,
          verification: null,
          feedbackSubmitted: null
        },
        message: `Found **${claims.length}** claim(s) in message **${promptId}**.`
      };
    }

    if (analysisType === 'verify') {
      let result = await client.verifyMessage(projectId, sessionId, promptId);
      return {
        output: {
          analysisType,
          trustScore: null,
          claims: null,
          verification: result,
          feedbackSubmitted: null
        },
        message: `Verified message **${promptId}**.`
      };
    }

    // feedback
    if (!ctx.input.feedback) {
      throw new Error('feedback value is required when analysisType is "feedback"');
    }
    await client.submitMessageFeedback(projectId, sessionId, promptId, ctx.input.feedback);
    return {
      output: {
        analysisType,
        trustScore: null,
        claims: null,
        verification: null,
        feedbackSubmitted: true
      },
      message: `Submitted **${ctx.input.feedback}** feedback for message **${promptId}**.`
    };
  })
  .build();
