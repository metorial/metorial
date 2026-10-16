import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

export let checkEmail = SlateTool.create(spec, {
  name: 'Check Email',
  key: 'check_email',
  description:
    'Run one focused email check: identify a free or disposable provider, suggest spelling corrections, or extract a name. Results describe provider-reported properties and do not verify that a mailbox exists.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      email: z.string().describe('Email address to check'),
      check: z
        .enum(['freemail', 'disposable', 'typos', 'name'])
        .describe('The single check to run')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address submitted for the check'),
      isFreemail: z
        .boolean()
        .optional()
        .describe('Whether RiteKit identifies a free email provider'),
      isDisposable: z
        .boolean()
        .optional()
        .describe('Whether RiteKit identifies a disposable email provider'),
      typoSuggestions: z
        .array(z.string())
        .optional()
        .describe('Suggested corrected email addresses'),
      firstName: z.string().optional().describe('Given name extracted by RiteKit'),
      lastName: z.string().optional().describe('Surname extracted by RiteKit'),
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let output: {
      email: string;
      isFreemail?: boolean;
      isDisposable?: boolean;
      typoSuggestions?: string[];
      firstName?: string;
      lastName?: string;
      raw: Record<string, unknown>;
    };
    if (ctx.input.check === 'freemail') {
      let result = await client.freemailDetection(ctx.input.email);
      output = { email: ctx.input.email, isFreemail: result.freemail, raw: { ...result } };
    } else if (ctx.input.check === 'disposable') {
      let result = await client.disposableEmailDetection(ctx.input.email);
      output = { email: ctx.input.email, isDisposable: result.disposable, raw: { ...result } };
    } else if (ctx.input.check === 'typos') {
      let result = await client.emailTypo(ctx.input.email);
      output = {
        email: ctx.input.email,
        typoSuggestions: result.suggestions,
        raw: { ...result }
      };
    } else {
      let result = await client.nameFromEmail(ctx.input.email);
      output = {
        email: ctx.input.email,
        firstName: result.info?.givenName ?? result.name,
        lastName: result.info?.surname ?? result.surname,
        raw: { ...result }
      };
    }
    return {
      output,
      message: `Completed the ${ctx.input.check} check for **${ctx.input.email}**.`
    };
  })
  .build();
