import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { netlifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let submissionOutputSchema = z.object({
  submissionId: z.string().describe('Unique submission identifier'),
  formId: z.string().optional().describe('Form ID this submission belongs to'),
  number: z.number().optional().describe('Submission sequence number'),
  formName: z.string().optional().describe('Form name'),
  siteUrl: z.string().optional().describe('Site URL'),
  body: z.string().optional().describe('Submission body as JSON string'),
  data: z.string().optional().describe('Submission data as a JSON string'),
  createdAt: z.string().optional().describe('Submission timestamp'),
  name: z.string().optional().describe('Submitter name'),
  firstName: z.string().optional().describe('Submitter first name'),
  lastName: z.string().optional().describe('Submitter last name'),
  email: z.string().optional().describe('Submitter email'),
  company: z.string().optional().describe('Submitter company'),
  summary: z.string().optional().describe('Submission summary')
});

let mapSubmission = (sub: any) => ({
  submissionId: sub.id,
  formId: sub.form_id ?? undefined,
  number: sub.number ?? undefined,
  formName: sub.form_name ?? undefined,
  siteUrl: sub.site_url ?? undefined,
  body: sub.body ?? (sub.data ? JSON.stringify(sub.data) : undefined),
  data: sub.data ? JSON.stringify(sub.data) : undefined,
  createdAt: sub.created_at ?? undefined,
  name: sub.name ?? undefined,
  firstName: sub.first_name ?? undefined,
  lastName: sub.last_name ?? undefined,
  email: sub.email ?? undefined,
  company: sub.company ?? undefined,
  summary: sub.summary ?? undefined
});

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List all forms for a Netlify site. Returns form metadata including submission count and creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to list forms for')
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.string().describe('Unique form identifier'),
          name: z.string().describe('Form name'),
          siteId: z.string().describe('Site the form belongs to'),
          submissionCount: z.number().describe('Number of submissions'),
          paths: z.array(z.string()).optional().describe('Paths where the form appears'),
          createdAt: z.string().optional().describe('Form creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let forms = await client.listForms(ctx.input.siteId);

    let mapped = forms.map((form: any) => ({
      formId: form.id,
      name: form.name || '',
      siteId: form.site_id,
      submissionCount: form.submission_count || 0,
      paths: form.paths,
      createdAt: form.created_at
    }));

    return {
      output: { forms: mapped },
      message: `Found **${mapped.length}** form(s) for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let listFormSubmissions = SlateTool.create(spec, {
  name: 'List Form Submissions',
  key: 'list_form_submissions',
  description: `List form submissions for a specific form or all forms on a site. Returns submission data, timestamps, and sender information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z
        .string()
        .optional()
        .describe('Form ID to list submissions for a specific form'),
      siteId: z
        .string()
        .optional()
        .describe('Site ID to list all submissions across all forms'),
      state: z
        .enum(['verified', 'spam'])
        .optional()
        .describe('Submission state to list. Omit or use "verified" for normal submissions.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of submissions per page')
    })
  )
  .output(
    z.object({
      submissions: z.array(submissionOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let submissions: any[];
    if (ctx.input.formId) {
      submissions = await client.listFormSubmissions(ctx.input.formId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        state: ctx.input.state
      });
    } else if (ctx.input.siteId) {
      submissions = await client.listSiteSubmissions(ctx.input.siteId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        state: ctx.input.state
      });
    } else {
      throw netlifyServiceError('Either formId or siteId must be provided');
    }

    let mapped = submissions.map(mapSubmission);

    return {
      output: { submissions: mapped },
      message: `Found **${mapped.length}** submission(s).`
    };
  })
  .build();

export let getFormSubmission = SlateTool.create(spec, {
  name: 'Get Form Submission',
  key: 'get_form_submission',
  description: `Get a specific Netlify form submission by ID, including submitted fields and sender metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      submissionId: z.string().describe('The submission ID to retrieve')
    })
  )
  .output(submissionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let submissions = await client.getFormSubmission(ctx.input.submissionId);
    let submission = Array.isArray(submissions) ? submissions[0] : submissions;
    if (!submission) {
      throw netlifyServiceError(`Submission ${ctx.input.submissionId} was not returned`);
    }

    return {
      output: mapSubmission(submission),
      message: `Retrieved submission **${ctx.input.submissionId}**.`
    };
  })
  .build();

export let manageFormSubmissionState = SlateTool.create(spec, {
  name: 'Manage Form Submission State',
  key: 'manage_form_submission_state',
  description: `Mark a Netlify form submission as spam or verified (ham).`
})
  .input(
    z.object({
      submissionId: z.string().describe('The submission ID to update'),
      state: z.enum(['spam', 'verified']).describe('Target submission state')
    })
  )
  .output(
    z.object({
      submission: submissionOutputSchema
        .optional()
        .describe('Updated submission, if returned'),
      state: z.string().describe('Target state applied to the submission')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result =
      ctx.input.state === 'spam'
        ? await client.markSubmissionSpam(ctx.input.submissionId)
        : await client.markSubmissionHam(ctx.input.submissionId);
    let submission = Array.isArray(result) ? result[0] : result;

    return {
      output: {
        submission: submission ? mapSubmission(submission) : undefined,
        state: ctx.input.state
      },
      message: `Marked submission **${ctx.input.submissionId}** as **${ctx.input.state}**.`
    };
  })
  .build();

export let deleteFormSubmission = SlateTool.create(spec, {
  name: 'Delete Form Submission',
  key: 'delete_form_submission',
  description: `Delete a specific form submission by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      submissionId: z.string().describe('The submission ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the submission was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSubmission(ctx.input.submissionId);

    return {
      output: { deleted: true },
      message: `Deleted submission **${ctx.input.submissionId}**.`
    };
  })
  .build();
