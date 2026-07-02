import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve account information including credit balance, sending profiles (email & SMS), contact field definitions, and content categories. Useful for getting profile IDs needed when creating campaigns.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      includeBalance: z.boolean().optional().describe('Include email and SMS credit balance'),
      includeSendingProfiles: z
        .boolean()
        .optional()
        .describe('Include email sending profiles'),
      includeSmsSendingProfiles: z
        .boolean()
        .optional()
        .describe('Include SMS sending profiles'),
      includeContactFields: z
        .boolean()
        .optional()
        .describe('Include contact field definitions'),
      includeContentCategories: z.boolean().optional().describe('Include content categories')
    })
  )
  .output(
    z.object({
      balance: z.any().optional().describe('Account credit balance'),
      sendingProfiles: z.array(z.any()).optional().describe('Email sending profiles'),
      smsSendingProfiles: z.array(z.any()).optional().describe('SMS sending profiles'),
      contactFields: z.array(z.any()).optional().describe('Contact field definitions'),
      contentCategories: z.array(z.any()).optional().describe('Content categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let output: Record<string, any> = {};

    if (ctx.input.includeBalance !== false) {
      output.balance = await client.getAccountBalance();
    }
    if (ctx.input.includeSendingProfiles) {
      output.sendingProfiles = await client.getSendingProfiles();
    }
    if (ctx.input.includeSmsSendingProfiles) {
      output.smsSendingProfiles = await client.getSmsSendingProfiles();
    }
    if (ctx.input.includeContactFields) {
      output.contactFields = await client.getContactFields();
    }
    if (ctx.input.includeContentCategories) {
      output.contentCategories = await client.getContentCategories();
    }

    return {
      output: output as any,
      message: `Retrieved account information.`
    };
  })
  .build();

export let getExecutiveReport = SlateTool.create(spec, {
  name: 'Get Executive Report',
  key: 'get_executive_report',
  description: `Retrieve executive-level reports including overall account statistics and contact growth over time.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      includeContactGrowth: z.boolean().optional().describe('Include contact growth over time')
    })
  )
  .output(
    z.object({
      executiveReport: z.any().describe('Executive report summary'),
      contactGrowth: z.any().optional().describe('Contact growth metrics over time')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let executiveReport = await client.getExecutiveReport();
    let output: Record<string, any> = { executiveReport };

    if (ctx.input.includeContactGrowth) {
      output.contactGrowth = await client.getContactGrowthReport();
    }

    return {
      output: output as any,
      message: `Retrieved executive report.`
    };
  })
  .build();
