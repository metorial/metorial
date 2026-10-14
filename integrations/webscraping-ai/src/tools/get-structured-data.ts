import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStructuredData = SlateTool.create(spec, {
  name: 'Get Structured Page Data',
  key: 'get_structured_data',
  description:
    'Retrieve structured JSON from a public page on a supported site such as YouTube, TikTok, X, LinkedIn, Instagram, or Reddit. The provider detects the site and page type from the URL.',
  instructions: [
    'Unsupported sites or page types return an error. Use extract_fields for other websites.',
    'Check parse_status: ok, parse_failed, and not_found are all billed responses. Data can be null or partial.',
    'Transcript options apply to YouTube videos only.'
  ],
  constraints: ['Costs 15 credits per successful request, or 50 for Reddit.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z.string().describe('Public page URL on a supported site.'),
      country: z.string().optional().describe('Proxy country code. Defaults to us.'),
      transcript: z
        .boolean()
        .optional()
        .describe(
          'Fetch captions for a YouTube video. A missing matching transcript is returned as null.'
        ),
      transcriptLanguage: z
        .string()
        .optional()
        .describe(
          'Caption language code, such as de. Requires transcript=true. Without a language, English is preferred, then the first available track.'
        )
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.unknown())
        .describe(
          'Provider response containing request_parameters, parse_status, and nullable or partial data whose fields depend on the site and page type.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getStructuredData(ctx.input);
    return {
      output: { result },
      message: `Retrieved the structured-data response for **${ctx.input.url}**.`
    };
  })
  .build();
