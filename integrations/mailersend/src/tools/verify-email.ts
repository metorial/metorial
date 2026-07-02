import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifySingleEmail = SlateTool.create(spec, {
  name: 'Verify Email Address',
  key: 'verify_single_email',
  description: `Verify a single email address to check if it's valid, risky, or undeliverable. Helps reduce bounces by validating addresses at the point of collection.`,
  tags: {
    readOnly: true
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
      output: { verificationResult: result.data },
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
    'Check results using "Get Verification List" to monitor progress.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the verification list.'),
      emails: z.array(z.string()).describe('List of email addresses to verify.')
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
      emails: ctx.input.emails
    });

    let d = result.data;

    return {
      output: {
        verificationListId: String(d.id || ''),
        name: String(d.name || ''),
        totalEmails: (d.total as number) || ctx.input.emails.length,
        status: String(d.status || 'created')
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
        .describe('Current status (e.g., "queued", "verifying", "completed").'),
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
        status: String(d.status || ''),
        listData: d
      },
      message: `Verification list **${d.name}**: Status is **${d.status}**.`
    };
  })
  .build();
