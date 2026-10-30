import { createApiServiceError, getFileUrlTool, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  bulkForm,
  downloadRefreshAt,
  fileMimeType,
  identifier,
  jobInput,
  jobOutput,
  parseBulkFiles,
  parseJob,
  parseStart,
  requireNonempty,
  startOutput,
  struct,
  tier,
  validateResearch
} from '../lib/enrichment';
import { spec } from '../spec';

const billable =
  'Starts a billable job. If submission times out, the job may still exist. Do not blindly resubmit.';
const poll =
  'Pass task_id to sixtyfour_enrichment_job_status to retrieve results. Research can take several minutes.';
const researchFields = {
  struct: struct.describe(
    'Output field names mapped to research descriptions or description/type objects.'
  ),
  tier: tier
    .optional()
    .describe('Research depth; defaults to low. High requires organization access.'),
  research_plan: z
    .string()
    .max(10000)
    .optional()
    .describe('Natural-language guidance for the research.'),
  field_confidence: z
    .boolean()
    .optional()
    .describe('Include confidence, justification and sources per requested field.')
};
const companyFields = {
  find_people: z.boolean().optional().describe('Also discover people at the company.'),
  people_focus_prompt: z
    .string()
    .max(10000)
    .optional()
    .describe('Which people to discover when find_people is true.'),
  lead_struct: struct
    .optional()
    .describe('Requested output fields for each discovered person.'),
  full_org_chart: z
    .boolean()
    .optional()
    .describe('Return the full organization chart instead of a focused list.')
};
const companyIntelligenceStart = SlateTool.create(spec, {
  key: 'sixtyfour_company_intelligence_start',
  name: 'Start Company Intelligence',
  description: 'Research a company and return a job ID; optionally discover its people.',
  instructions: [poll],
  constraints: [billable],
  tags: { readOnly: false }
})
  .input(
    z.object({
      target_company: identifier.describe(
        'Company identifiers such as company_name, domain or linkedin.'
      ),
      ...researchFields,
      ...companyFields
    })
  )
  .output(startOutput)
  .handleInvocation(async ctx => {
    requireNonempty(ctx.input.target_company, 'target_company');
    validateResearch(ctx.input.struct, ctx.input.tier);
    const output = parseStart(
      await new Client(ctx.auth).post(
        '/company-intelligence-async',
        pickDefined({
          target_company: ctx.input.target_company,
          struct: ctx.input.struct,
          tier: ctx.input.tier,
          research_plan: ctx.input.research_plan,
          field_confidence: ctx.input.field_confidence,
          find_people: ctx.input.find_people,
          people_focus_prompt: ctx.input.people_focus_prompt,
          lead_struct: ctx.input.lead_struct,
          full_org_chart: ctx.input.full_org_chart
        })
      )
    );
    return { output, message: `Company research started: ${output.task_id}.` };
  })
  .build();
const peopleIntelligenceStart = SlateTool.create(spec, {
  key: 'sixtyfour_people_intelligence_start',
  name: 'Start People Intelligence',
  description: 'Research one person using the identifiers and output fields you provide.',
  instructions: [poll],
  constraints: [billable],
  tags: { readOnly: false }
})
  .input(
    z.object({
      lead_info: identifier.describe(
        'Person identifiers such as name, company, email or linkedin.'
      ),
      ...researchFields
    })
  )
  .output(startOutput)
  .handleInvocation(async ctx => {
    requireNonempty(ctx.input.lead_info, 'lead_info');
    validateResearch(ctx.input.struct, ctx.input.tier);
    const output = parseStart(
      await new Client(ctx.auth).post(
        '/people-intelligence-async',
        pickDefined({
          lead_info: ctx.input.lead_info,
          struct: ctx.input.struct,
          tier: ctx.input.tier,
          research_plan: ctx.input.research_plan,
          field_confidence: ctx.input.field_confidence
        })
      )
    );
    return { output, message: `People research started: ${output.task_id}.` };
  })
  .build();
const leads = z
  .array(identifier)
  .min(1)
  .max(100)
  .describe('One to 100 people with identifiers such as name, company or linkedin.');
const findEmailStart = SlateTool.create(spec, {
  key: 'sixtyfour_find_email_start',
  name: 'Start Email Discovery',
  description: 'Find email addresses for one to 100 people in a background job.',
  instructions: [poll],
  constraints: [billable],
  tags: { readOnly: false }
})
  .input(
    z.object({
      leads,
      mode: z
        .enum(['PROFESSIONAL', 'PERSONAL'])
        .optional()
        .describe('Work or personal emails; defaults to PROFESSIONAL.'),
      verify_emails: z
        .boolean()
        .optional()
        .describe('SMTP-verify discovered emails; defaults to true.')
    })
  )
  .output(startOutput)
  .handleInvocation(async ctx => {
    ctx.input.leads.forEach(lead => requireNonempty(lead, 'each lead'));
    const output = parseStart(
      await new Client(ctx.auth).post(
        '/find-email-bulk-async',
        pickDefined({
          leads: ctx.input.leads,
          mode: ctx.input.mode,
          verify_emails: ctx.input.verify_emails
        })
      )
    );
    return { output, message: `Email discovery started: ${output.task_id}.` };
  })
  .build();
const findPhoneStart = SlateTool.create(spec, {
  key: 'sixtyfour_find_phone_start',
  name: 'Start Phone Discovery',
  description: 'Find phone numbers for one to 100 people in a background job.',
  instructions: [poll],
  constraints: [billable],
  tags: { readOnly: false }
})
  .input(z.object({ leads }))
  .output(startOutput)
  .handleInvocation(async ctx => {
    ctx.input.leads.forEach(lead => requireNonempty(lead, 'each lead'));
    const output = parseStart(
      await new Client(ctx.auth).post('/find-phone-bulk-async', { leads: ctx.input.leads })
    );
    return { output, message: `Phone discovery started: ${output.task_id}.` };
  })
  .build();
const reverseEmailStart = SlateTool.create(spec, {
  key: 'sixtyfour_reverse_email_start',
  name: 'Start Reverse Email Lookup',
  description: 'Resolve the people behind one to 100 email addresses.',
  instructions: [poll],
  constraints: [billable],
  tags: { readOnly: false }
})
  .input(
    z.object({
      emails: z
        .array(z.string().email())
        .min(1)
        .max(100)
        .describe('Email addresses to resolve.')
    })
  )
  .output(startOutput)
  .handleInvocation(async ctx => {
    const output = parseStart(
      await new Client(ctx.auth).post('/reverse-email-bulk-async', {
        leads: ctx.input.emails.map(email => ({ email }))
      })
    );
    return { output, message: `Reverse email lookup started: ${output.task_id}.` };
  })
  .build();
const reversePhoneStart = SlateTool.create(spec, {
  key: 'sixtyfour_reverse_phone_start',
  name: 'Start Reverse Phone Lookup',
  description: 'Resolve the people behind one to 100 phone numbers.',
  instructions: [poll],
  constraints: [billable],
  tags: { readOnly: false }
})
  .input(
    z.object({
      phones: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(100)
        .describe('Phone numbers, including country codes, to resolve.')
    })
  )
  .output(startOutput)
  .handleInvocation(async ctx => {
    const output = parseStart(
      await new Client(ctx.auth).post('/reverse-phone-bulk-async', {
        leads: ctx.input.phones.map(phone => ({ phone }))
      })
    );
    return { output, message: `Reverse phone lookup started: ${output.task_id}.` };
  })
  .build();
const enrichmentJobStatus = SlateTool.create(spec, {
  key: 'sixtyfour_enrichment_job_status',
  name: 'Get Enrichment Job Status',
  description:
    'Get the status, credit charge and results of an enrichment, contact lookup or bulk intelligence job. Completed bulk files are downloadable.',
  instructions: [
    'Use sixtyfour_verify_age_status for age verification and sixtyfour_find_similar_status for similar-people searches.',
    'Poll at intervals of at least 10 seconds. Terminal statuses are completed, failed, cancelled, terminated and timed_out.'
  ],
  tags: { readOnly: true }
})
  .input(jobInput)
  .output(jobOutput)
  .handleInvocation(async ctx => {
    const data = await new Client(ctx.auth).get(
      `/job-status/${encodeURIComponent(ctx.input.task_id)}`
    );
    const files = parseBulkFiles(data.results);
    for (const file of files) {
      await ctx.addAttachment({
        type: 'url',
        url: file.download_url,
        mimeType: fileMimeType(file.filename),
        headers: { 'x-api-key': ctx.auth.token },
        refreshReference: {
          kind: 'bulk_intelligence',
          task_id: ctx.input.task_id,
          filename: file.filename,
          block_number: file.block_number ?? null
        },
        refreshAt: downloadRefreshAt()
      });
    }
    const output = parseJob(data, ctx.input.task_id, files);
    return { output, message: `Enrichment job ${output.task_id}: ${output.status}.` };
  })
  .build();
const enrichLinkedin = SlateTool.create(spec, {
  key: 'sixtyfour_enrich_linkedin',
  name: 'Enrich LinkedIn Profile',
  description: 'Extract structured fields from one LinkedIn person or company URL.',
  constraints: ['Consumes credits.'],
  tags: { readOnly: false }
})
  .input(
    z.object({
      linkedin_url: z.string().url().describe('Full LinkedIn person or company URL.'),
      struct: struct
        .optional()
        .describe(
          'Requested output fields and their descriptions; omitted uses provider defaults.'
        )
    })
  )
  .output(
    z.object({
      linkedin_url: z.string().describe('Requested LinkedIn URL.'),
      structured_data: z
        .unknown()
        .optional()
        .describe('Extracted fields returned by Sixtyfour.'),
      result: identifier.describe('Additional profile result metadata.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.struct) requireNonempty(ctx.input.struct, 'struct');
    const result = await new Client(ctx.auth).post(
      '/enrich-linkedin',
      pickDefined({
        linkedin_url: ctx.input.linkedin_url,
        struct: ctx.input.struct
      })
    );
    return {
      output: {
        linkedin_url: ctx.input.linkedin_url,
        structured_data: result.structured_data,
        result
      },
      message: 'LinkedIn enrichment completed.'
    };
  })
  .build();
const bulkFields = {
  rows: z
    .array(identifier)
    .min(1)
    .max(100000)
    .optional()
    .describe('Records to enrich. Provide rows or csv_text, never both.'),
  csv_text: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('CSV content including a header row. Provide this or rows, never both.'),
  ...researchFields,
  result_formats: z
    .array(z.enum(['csv', 'ndjson']))
    .min(1)
    .optional()
    .describe('Result formats; CSV is always produced. Add ndjson for typed values.'),
  save_json: z.boolean().optional().describe('Also save JSON result files.')
};
const peopleBulkStart = SlateTool.create(spec, {
  key: 'sixtyfour_people_bulk_intelligence_start',
  name: 'Start Bulk People Intelligence',
  description:
    'Research the same output fields for a batch of people supplied as rows or CSV.',
  instructions: [poll],
  constraints: [
    billable,
    'At most 100 MB and 100,000 rows. Use smaller batches to keep request size practical.'
  ],
  tags: { readOnly: false }
})
  .input(z.object(bulkFields))
  .output(startOutput)
  .handleInvocation(async ctx => {
    validateResearch(ctx.input.struct, ctx.input.tier);
    const form = bulkForm(ctx.input.rows, ctx.input.csv_text, {
      struct: ctx.input.struct,
      tier: ctx.input.tier,
      research_plan: ctx.input.research_plan,
      field_confidence: ctx.input.field_confidence,
      result_formats: ctx.input.result_formats,
      save_json: ctx.input.save_json
    });
    const output = parseStart(
      await new Client(ctx.auth).postForm('/bulk-intelligence/people', form)
    );
    return { output, message: `Bulk people research started: ${output.task_id}.` };
  })
  .build();
const companyBulkStart = SlateTool.create(spec, {
  key: 'sixtyfour_company_bulk_intelligence_start',
  name: 'Start Bulk Company Intelligence',
  description:
    'Research the same output fields for a batch of companies supplied as rows or CSV.',
  instructions: [poll],
  constraints: [
    billable,
    'At most 100 MB and 100,000 rows. Use smaller batches to keep request size practical.'
  ],
  tags: { readOnly: false }
})
  .input(z.object({ ...bulkFields, ...companyFields }))
  .output(startOutput)
  .handleInvocation(async ctx => {
    validateResearch(ctx.input.struct, ctx.input.tier);
    const form = bulkForm(ctx.input.rows, ctx.input.csv_text, {
      struct: ctx.input.struct,
      tier: ctx.input.tier,
      research_plan: ctx.input.research_plan,
      field_confidence: ctx.input.field_confidence,
      result_formats: ctx.input.result_formats,
      save_json: ctx.input.save_json,
      find_people: ctx.input.find_people,
      people_focus_prompt: ctx.input.people_focus_prompt,
      lead_struct: ctx.input.lead_struct,
      full_org_chart: ctx.input.full_org_chart
    });
    const output = parseStart(
      await new Client(ctx.auth).postForm('/bulk-intelligence/company', form)
    );
    return { output, message: `Bulk company research started: ${output.task_id}.` };
  })
  .build();
const verifyAgeStart = SlateTool.create(spec, {
  key: 'sixtyfour_verify_age_start',
  name: 'Start Age Verification',
  description: 'Research a person’s date of birth or estimated age from public evidence.',
  instructions: ['Poll the returned task_id with sixtyfour_verify_age_status.'],
  constraints: [billable],
  tags: { readOnly: false }
})
  .input(
    z.object({
      subject: identifier.describe(
        'Person identifiers such as name, company, linkedin, email or location.'
      )
    })
  )
  .output(startOutput)
  .handleInvocation(async ctx => {
    requireNonempty(ctx.input.subject, 'subject');
    const output = parseStart(
      await new Client(ctx.auth).post('/verify-age', { subject: ctx.input.subject })
    );
    return { output, message: `Age verification started: ${output.task_id}.` };
  })
  .build();
const ageOutput = z.object({
  task_id: z.string().describe('Age verification job ID.'),
  status: z.string().describe('Current job status, normalized to lowercase.'),
  date_of_birth: z
    .object({
      day: z.number().int().min(1).max(31).nullable(),
      month: z.number().int().min(1).max(12).nullable(),
      year: z.number().int().nullable(),
      confidence: z.number().min(0).max(100)
    })
    .optional()
    .describe('Established date components and confidence.'),
  age: z
    .object({
      value: z.number().int().nullable(),
      as_of: z.string(),
      confidence: z.number().min(0).max(100)
    })
    .optional()
    .describe('Exact or estimated age, calculation date and confidence.'),
  evidence: z.string().optional().describe('Explanation of the evidence behind the result.'),
  sources: z.array(z.string()).optional().describe('Source URLs supporting the result.'),
  error: z.unknown().optional().describe('Provider-reported failure details.')
});
const verifyAgeStatus = SlateTool.create(spec, {
  key: 'sixtyfour_verify_age_status',
  name: 'Get Age Verification Status',
  description:
    'Retrieve an age verification job’s status and completed evidence, date of birth and age.',
  instructions: [
    'Use the task_id from sixtyfour_verify_age_start. Poll at intervals of at least 10 seconds.'
  ],
  tags: { readOnly: true }
})
  .input(jobInput)
  .output(ageOutput)
  .handleInvocation(async ctx => {
    const data = await new Client(ctx.auth).get(
      `/verify-age/${encodeURIComponent(ctx.input.task_id)}`
    );
    const parsed = ageOutput.safeParse({
      ...data,
      task_id: ctx.input.task_id,
      status: typeof data.status === 'string' ? data.status.toLowerCase() : data.status
    });
    if (!parsed.success)
      throw createApiServiceError('Sixtyfour returned invalid age verification metadata.');
    return {
      output: parsed.data,
      message: `Age verification ${ctx.input.task_id}: ${parsed.data.status}.`
    };
  })
  .build();

const refreshReference = z.object({
  kind: z.literal('bulk_intelligence'),
  task_id: z.string().min(1),
  filename: z.string().min(1),
  block_number: z.number().nullable()
});
export const enrichmentGetFileUrl = getFileUrlTool(spec, async ctx => {
  const parsed = refreshReference.safeParse(ctx.input.reference);
  if (!parsed.success)
    throw createApiServiceError(
      'The file reference is invalid. Retrieve the job results again.'
    );
  const reference = parsed.data;
  const data = await new Client(ctx.auth).get(
    `/job-status/${encodeURIComponent(reference.task_id)}`
  );
  const file = parseBulkFiles(data.results).find(
    candidate =>
      candidate.filename === reference.filename &&
      (candidate.block_number ?? null) === reference.block_number
  );
  if (!file)
    throw createApiServiceError(
      'The requested result file is no longer available. Retrieve the job results again.'
    );
  return {
    url: file.download_url,
    expiresAt: downloadRefreshAt(),
    headers: { 'x-api-key': ctx.auth.token },
    query: {}
  };
});
export const enrichmentTools = [
  companyIntelligenceStart,
  peopleIntelligenceStart,
  findEmailStart,
  findPhoneStart,
  reverseEmailStart,
  reversePhoneStart,
  enrichmentJobStatus,
  enrichLinkedin,
  peopleBulkStart,
  companyBulkStart,
  verifyAgeStart,
  verifyAgeStatus,
  enrichmentGetFileUrl
];
