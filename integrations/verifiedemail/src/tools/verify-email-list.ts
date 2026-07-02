import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmailList = SlateTool.create(spec, {
  name: 'Verify Email List',
  key: 'verify_email_list',
  description: `Start bulk verification of an existing email list. Initiates the verification process for all unverified emails in the list and returns a summary with counts by status category.

Large lists may take time to process. Use webhooks or poll the list status to know when verification completes.`,
  instructions: [
    'Provide the list ID from a previously created email list.',
    'For large lists (100,000+), verification may take a significant amount of time.'
  ],
  constraints: [
    'Credits are locked for the total number of unverified emails when verification starts. Credits for duplicates and previously verified addresses within 24 hours are refunded.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the email list to verify')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('ID of the email list'),
      totalEmails: z.number().describe('Total number of emails in the list'),
      deliverable: z.number().describe('Number of deliverable emails'),
      undeliverable: z.number().describe('Number of undeliverable emails'),
      risky: z.number().describe('Number of risky emails'),
      unknown: z.number().describe('Number of emails with unknown status'),
      duplicates: z.number().describe('Number of duplicate emails removed'),
      status: z.string().describe('Current verification status (e.g. processing, completed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress(`Starting verification for list ${ctx.input.listId}`);
    let summary = await client.verifyList(ctx.input.listId);

    return {
      output: summary,
      message: `Verification **${summary.status}** for list \`${summary.listId}\`. Total: **${summary.totalEmails}** emails. Deliverable: **${summary.deliverable}**, Undeliverable: **${summary.undeliverable}**, Risky: **${summary.risky}**, Unknown: **${summary.unknown}**, Duplicates: **${summary.duplicates}**.`
    };
  })
  .build();
