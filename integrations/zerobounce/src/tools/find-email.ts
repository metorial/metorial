import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Searches for a business email address by combining a person's name with a domain or company name. Tests email format patterns in real time until it finds a valid business email.
Can also discover the email format patterns used by an organization when called without a person's name.`,
  instructions: [
    'Either domain or companyName must be provided.',
    'Providing firstName and lastName improves results when looking for a specific person.',
    'A successful search consumes 1 subscription query or 20 credits. No credits are deducted for undetermined results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe('The email domain to search (e.g. "example.com")'),
      companyName: z.string().optional().describe('The company name to search'),
      firstName: z.string().optional().describe("Person's first name"),
      middleName: z.string().optional().describe("Person's middle name"),
      lastName: z.string().optional().describe("Person's last name")
    })
  )
  .output(
    z.object({
      email: z.string().describe('The discovered email address, if found'),
      emailConfidence: z.string().describe('Confidence level: HIGH, MEDIUM, or LOW'),
      domain: z.string().describe('The domain that was searched'),
      companyName: z.string().describe('The associated company name'),
      format: z
        .string()
        .optional()
        .describe('The email format pattern used (e.g. "first.last")'),
      confidence: z.string().optional().describe('Confidence level for the format pattern'),
      didYouMean: z
        .string()
        .optional()
        .describe('Alternative domain suggestion if applicable'),
      failureReason: z
        .string()
        .optional()
        .describe('Reason for failure, if the search was unsuccessful'),
      otherDomainFormats: z
        .array(
          z.object({
            format: z.string().describe('Alternative email format pattern'),
            confidence: z.string().describe('Confidence level for this format')
          })
        )
        .optional()
        .describe('Other email format patterns found for the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info(`Finding email for domain: ${ctx.input.domain || ctx.input.companyName}`);

    let result = await client.findEmail({
      domain: ctx.input.domain,
      companyName: ctx.input.companyName,
      firstName: ctx.input.firstName,
      middleName: ctx.input.middleName,
      lastName: ctx.input.lastName
    });

    let otherFormats = Array.isArray(result.other_domain_formats)
      ? result.other_domain_formats.map((f: Record<string, string>) => ({
          format: String(f.format || ''),
          confidence: String(f.confidence || '')
        }))
      : undefined;

    let output = {
      email: String(result.email || ''),
      emailConfidence: String(result.email_confidence || result.confidence || ''),
      domain: String(result.domain || ''),
      companyName: String(result.company_name || ''),
      format: result.format ? String(result.format) : undefined,
      confidence: result.confidence ? String(result.confidence) : undefined,
      didYouMean: result.did_you_mean ? String(result.did_you_mean) : undefined,
      failureReason: result.failure_reason ? String(result.failure_reason) : undefined,
      otherDomainFormats: otherFormats
    };

    if (output.email) {
      return {
        output,
        message: `Found email **${output.email}** (confidence: ${output.emailConfidence}) for domain **${output.domain}**.`
      };
    } else {
      return {
        output,
        message: `Could not find an email for **${output.domain || ctx.input.companyName}**.${output.failureReason ? ` Reason: ${output.failureReason}` : ''} ${output.format ? `Domain format: ${output.format}` : ''}`
      };
    }
  })
  .build();
