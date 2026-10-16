import { isApiErrorRecord, SlateTool } from 'slates';
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

    let info = isApiErrorRecord(insights.info) ? insights.info : undefined;
    let firstName =
      typeof insights.name === 'string'
        ? insights.name
        : typeof info?.givenName === 'string'
          ? info.givenName
          : undefined;
    let lastName =
      typeof insights.surname === 'string'
        ? insights.surname
        : typeof info?.surname === 'string'
          ? info.surname
          : undefined;

    return {
      output: {
        email: ctx.input.email,
        isFreemail: typeof insights.freemail === 'boolean' ? insights.freemail : undefined,
        isDisposable:
          typeof insights.disposable === 'boolean' ? insights.disposable : undefined,
        typoSuggestions:
          Array.isArray(insights.suggestions) &&
          insights.suggestions.every(value => typeof value === 'string')
            ? insights.suggestions
            : undefined,
        firstName: firstName,
        lastName: lastName,
        fullInsights: insights
      },
      message: `Retrieved provider-reported email insights for **${ctx.input.email}**.`
    };
  })
  .build();
