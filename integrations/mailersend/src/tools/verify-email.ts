import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let verificationListStatus = (data: Record<string, unknown>) => {
  let status = data.status;
  if (typeof status === 'string') return status;
  if (status && typeof status === 'object' && 'name' in status) {
    return String(status.name ?? '');
  }
  return '';
};

export let verifySingleEmail = SlateTool.create(spec, {
  name: 'Verify Email Address',
  key: 'verify_single_email',
  description: `Verify a single email address to check if it's valid, risky, or undeliverable. Helps reduce bounces by validating addresses at the point of collection.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to verify.')
    })
  )
  .output(
    z.object({
      verificationResult: z
        .record(z.string(), z.unknown())
        .describe('Full verification result including status, risk assessment, and details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifySingleEmail(ctx.input.email);

    return {
      output: { verificationResult: result },
      message: `Email verification complete for **${ctx.input.email}**.`
    };
  })
  .build();

export let createVerificationList = SlateTool.create(spec, {
  name: 'Create Verification List',
  key: 'create_verification_list',
  description: `Create a bulk email verification list and optionally start verification immediately. Upload a list of email addresses to check their validity in bulk.`,
  instructions: [
    'After creating the list, use "Start Verification List" to begin processing if not started automatically.',
    'Use get_verification_list to monitor progress and get_verification_list_results for per-address results.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the verification list.'),
      emails: z.array(z.string()).describe('List of email addresses to verify (1-10000).'),
      verify: z.boolean().optional().describe('Start verification immediately after upload.')
    })
  )
  .output(
    z.object({
      verificationListId: z.string().describe('ID of the created verification list.'),
      name: z.string().describe('Name of the verification list.'),
      totalEmails: z.number().describe('Total number of emails in the list.'),
      status: z.string().describe('Current status of the verification list.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createVerificationList({
      name: ctx.input.name,
      emails: ctx.input.emails,
      verify: ctx.input.verify
    });

    let d = result.data;

    return {
      output: {
        verificationListId: String(d.id || ''),
        name: String(d.name || ''),
        totalEmails: typeof d.total === 'number' ? d.total : ctx.input.emails.length,
        status: verificationListStatus(d)
      },
      message: `Verification list **${d.name}** created with ${ctx.input.emails.length} emails.`
    };
  })
  .build();

export let getVerificationList = SlateTool.create(spec, {
  name: 'Get Verification List',
  key: 'get_verification_list',
  description: `Retrieve the status and details of a bulk email verification list, including verification statistics and progress.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      verificationListId: z.string().describe('ID of the verification list to retrieve.')
    })
  )
  .output(
    z.object({
      verificationListId: z.string().describe('Verification list ID.'),
      name: z.string().describe('List name.'),
      status: z
        .string()
        .describe('Current status, such as uploading, verifying, or verified.'),
      listData: z
        .record(z.string(), z.unknown())
        .describe('Full list data including statistics breakdown.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getVerificationList(ctx.input.verificationListId);
    let d = result.data;

    return {
      output: {
        verificationListId: String(d.id || ''),
        name: String(d.name || ''),
        status: verificationListStatus(d),
        listData: d
      },
      message: `Verification list **${d.name}**: Status is **${verificationListStatus(d)}**.`
    };
  })
  .build();

export let listVerificationLists = SlateTool.create(spec, {
  name: 'List Verification Lists',
  key: 'list_verification_lists',
  description:
    'Find bulk email verification lists and their IDs, processing status, and statistics.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().int().min(1).optional().describe('Page number, starting at 1.'),
      limit: z
        .number()
        .int()
        .min(10)
        .max(100)
        .optional()
        .describe('Results per page (10-100, default 25).')
    })
  )
  .output(
    z.object({
      lists: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Verification lists including their IDs and status details.'),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider pagination metadata.'),
      links: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider links to adjacent result pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listVerificationLists(ctx.input);
    return {
      output: { lists: result.data, pagination: result.meta, links: result.links },
      message: `Retrieved ${result.data.length} verification lists on this page.`
    };
  })
  .build();

export let startVerificationList = SlateTool.create(spec, {
  name: 'Start Verification List',
  key: 'start_verification_list',
  description:
    'Start processing an uploaded bulk email verification list. Check its status and per-address results afterward.',
  constraints: [
    'The upload must be complete and the account must have sufficient verification credits.',
    'Starting a previously verified list runs verification again and consumes credits.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      verificationListId: z
        .string()
        .min(1)
        .describe(
          'Verification list ID from create_verification_list or list_verification_lists.'
        )
    })
  )
  .output(
    z.object({
      verificationListId: z.string().describe('Verification list ID.'),
      status: z.string().describe('Current processing status.'),
      listData: z
        .record(z.string(), z.unknown())
        .describe('Full list details and verification statistics.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.startVerificationList(ctx.input.verificationListId);
    let status = verificationListStatus(result.data);
    return {
      output: { verificationListId: String(result.data.id), status, listData: result.data },
      message: `Verification list \`${result.data.id}\` status: **${status}**.`
    };
  })
  .build();

export let getVerificationListResults = SlateTool.create(spec, {
  name: 'Get Verification List Results',
  key: 'get_verification_list_results',
  description:
    'Retrieve paginated validation results for individual email addresses in a bulk verification list. Optionally filter by result category.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      verificationListId: z
        .string()
        .min(1)
        .describe(
          'Verification list ID from create_verification_list or list_verification_lists.'
        ),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1.'),
      limit: z
        .number()
        .int()
        .min(10)
        .max(500)
        .optional()
        .describe('Results per page (10-500, default 25).'),
      results: z
        .array(
          z.enum([
            'valid',
            'catch_all',
            'mailbox_full',
            'role_based',
            'unknown',
            'failed',
            'syntax_error',
            'typo',
            'mailbox_not_found',
            'disposable',
            'mailbox_blocked'
          ])
        )
        .optional()
        .describe('Only return addresses with these verification outcomes.')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Per-address verification results.'),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider pagination metadata.'),
      links: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider links to adjacent result pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getVerificationListResults(
      ctx.input.verificationListId,
      ctx.input
    );
    return {
      output: { results: result.data, pagination: result.meta, links: result.links },
      message: `Retrieved ${result.data.length} address verification results on this page.`
    };
  })
  .build();
