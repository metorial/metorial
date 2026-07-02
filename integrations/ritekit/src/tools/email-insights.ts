import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

export let emailInsights = SlateTool.create(spec, {
  name: 'Email Insights',
  key: 'email_insights',
  description: `Analyzes an email address to detect free email providers, disposable/throwaway addresses, common typos, and extracts the person's name.
Combines multiple email validation checks into a single call. Use this for lead qualification, sign-up validation, or CRM enrichment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to analyze')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The analyzed email address'),
      isFreemail: z
        .boolean()
        .optional()
        .describe('Whether the email belongs to a free provider (e.g., Gmail, Yahoo)'),
      isDisposable: z
        .boolean()
        .optional()
        .describe('Whether the email is from a disposable/throwaway email service'),
      typoSuggestions: z
        .array(z.string())
        .optional()
        .describe('Suggested corrections if a typo was detected in the email domain'),
      firstName: z.string().optional().describe('First name extracted from the email address'),
      lastName: z.string().optional().describe('Last name extracted from the email address'),
      fullInsights: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete raw insights returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });

    let insights = await client.fullEmailInsights(ctx.input.email);

    return {
      output: {
        email: ctx.input.email,
        isFreemail: insights.freemail as boolean | undefined,
        isDisposable: insights.disposable as boolean | undefined,
        typoSuggestions: insights.suggestions as string[] | undefined,
        firstName: insights.name as string | undefined,
        lastName: insights.surname as string | undefined,
        fullInsights: insights
      },
      message: `Analyzed email **${ctx.input.email}**: ${insights.freemail ? 'freemail' : 'business email'}${insights.disposable ? ', disposable' : ''}${insights.name ? `, name: ${insights.name} ${insights.surname || ''}` : ''}`
    };
  })
  .build();
