import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

let emailResultSchema = z.object({
  emailAddress: z.string().describe('Discovered email address'),
  role: z.string().optional().describe('Whether it is a role-based address (yes/no)'),
  business: z.string().optional().describe('Whether it is a business email (yes/no)')
});

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Discover a person's pre-verified email address using their name and company domain. Returns matching email addresses with confidence scores and company information.
Use this for sales prospecting, lead enrichment, or finding contact information for outreach.`,
  constraints: [
    'Consumes credits per lookup.',
    'Rate limits apply based on your subscription plan.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the person (e.g., "Steven Morris")'),
      domain: z.string().describe('Company domain or website URL (e.g., "apple.com")'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum time in milliseconds for the search (e.g., 30000 for 30 seconds)')
    })
  )
  .output(
    z.object({
      emails: z.array(emailResultSchema).describe('Discovered email addresses'),
      firstName: z.string().optional().describe('Parsed first name'),
      lastName: z.string().optional().describe('Parsed last name'),
      fullName: z.string().optional().describe('Combined full name'),
      domain: z.string().optional().describe('The domain that was searched'),
      confidenceScore: z.number().optional().describe('AI-based confidence score (0-100)'),
      total: z.number().optional().describe('Total number of emails found'),
      companyName: z.string().optional().describe('Company name associated with the domain'),
      foundOn: z.string().optional().describe('Timestamp of when the email was discovered'),
      queueId: z
        .string()
        .optional()
        .describe('Queue ID if the request was queued for async processing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearoutClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.findEmail({
      name: ctx.input.name,
      domain: ctx.input.domain,
      timeout: ctx.input.timeout
    });

    let data = (result.data ?? result) as Record<string, unknown>;
    let emailsRaw = (data.emails ?? []) as Record<string, unknown>[];
    let company = data.company as Record<string, unknown> | undefined;

    let emails = emailsRaw.map(e => ({
      emailAddress: String(e.email_address ?? ''),
      role: e.role as string | undefined,
      business: e.business as string | undefined
    }));

    let output = {
      emails,
      firstName: data.first_name as string | undefined,
      lastName: data.last_name as string | undefined,
      fullName: data.full_name as string | undefined,
      domain: data.domain as string | undefined,
      confidenceScore: data.confidence_score as number | undefined,
      total: data.total as number | undefined,
      companyName: company?.name as string | undefined,
      foundOn: data.found_on as string | undefined,
      queueId: data.queue_id as string | undefined
    };

    let emailList = emails.map(e => e.emailAddress).join(', ');
    return {
      output,
      message:
        emails.length > 0
          ? `Found **${emails.length}** email(s) for **${ctx.input.name}** at **${ctx.input.domain}**: ${emailList} (confidence: ${output.confidenceScore ?? 'N/A'})`
          : `No email addresses found for **${ctx.input.name}** at **${ctx.input.domain}**.`
    };
  })
  .build();
