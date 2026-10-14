import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchDomain = SlateTool.create(spec, {
  name: 'Search Domain',
  key: 'search_domain',
  description:
    'Discover a company email domain and its email address patterns using a domain or company name. Returns the primary format, confidence, and alternative formats for finding business contacts.',
  instructions: [
    'Provide a domain or companyName; person names are not needed for domain search.',
    'A successful search consumes one subscription query or 20 credits. Undetermined results do not consume credits or queries.',
    'Use find_email with a person name to look up an individual business address.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe('Email domain to search, for example example.com'),
      companyName: z
        .string()
        .optional()
        .describe('Company name to discover a domain and email patterns for')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Discovered or supplied email domain'),
      companyName: z.string().describe('Company associated with the domain'),
      format: z.string().describe('Primary email address pattern, or empty if undetermined'),
      confidence: z.string().describe('Confidence in the primary pattern'),
      otherDomainFormats: z
        .array(
          z.object({
            format: z.string().describe('Alternative email address pattern'),
            confidence: z.string().describe('Confidence in this pattern')
          })
        )
        .describe('Alternative patterns for the domain'),
      didYouMean: z.string().describe('Suggested correction, if any'),
      failureReason: z.string().describe('Reason a pattern could not be determined, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.findEmail({
      domain: ctx.input.domain,
      companyName: ctx.input.companyName
    });
    let output = {
      domain: result.domain || ctx.input.domain || '',
      companyName: result.company_name || ctx.input.companyName || '',
      format: result.format || '',
      confidence: result.confidence || '',
      otherDomainFormats: result.other_domain_formats || [],
      didYouMean: result.did_you_mean || '',
      failureReason: result.failure_reason || ''
    };
    return {
      output,
      message: output.format
        ? `Found email pattern **${output.format}** for **${output.domain}** (confidence: ${output.confidence}).`
        : `No email pattern found for **${output.domain || output.companyName}**.${output.failureReason ? ` Reason: ${output.failureReason}` : ''}`
    };
  })
  .build();
