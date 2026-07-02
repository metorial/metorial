import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompanySettingsTool = SlateTool.create(spec, {
  name: 'Get Company Settings',
  key: 'get_company_settings',
  description: `Retrieve company configuration data from AccuLynx. Fetch general settings, insurance companies, job categories, trade types, work types, lead sources, document folders, photo/video tags, account types, and location settings. Specify which setting types to include.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeGeneral: z.boolean().optional().describe('Include general company settings'),
      includeInsuranceCompanies: z
        .boolean()
        .optional()
        .describe('Include insurance companies list'),
      includeJobCategories: z.boolean().optional().describe('Include job categories'),
      includeTradeTypes: z.boolean().optional().describe('Include trade types'),
      includeWorkTypes: z.boolean().optional().describe('Include work types'),
      includeLeadSources: z.boolean().optional().describe('Include lead sources'),
      includeDocumentFolders: z.boolean().optional().describe('Include document folder list'),
      includePhotoVideoTags: z.boolean().optional().describe('Include photo/video tags'),
      includeAccountTypes: z.boolean().optional().describe('Include active account types')
    })
  )
  .output(
    z.object({
      general: z.record(z.string(), z.any()).optional().describe('General company settings'),
      insuranceCompanies: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Insurance companies'),
      jobCategories: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Job categories'),
      tradeTypes: z.array(z.record(z.string(), z.any())).optional().describe('Trade types'),
      workTypes: z.array(z.record(z.string(), z.any())).optional().describe('Work types'),
      leadSources: z.array(z.record(z.string(), z.any())).optional().describe('Lead sources'),
      documentFolders: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Document folders'),
      photoVideoTags: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Photo/video tags'),
      accountTypes: z.array(z.record(z.string(), z.any())).optional().describe('Account types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let parts: string[] = [];
    let output: Record<string, any> = {};

    let noSpecificSelection =
      !ctx.input.includeGeneral &&
      !ctx.input.includeInsuranceCompanies &&
      !ctx.input.includeJobCategories &&
      !ctx.input.includeTradeTypes &&
      !ctx.input.includeWorkTypes &&
      !ctx.input.includeLeadSources &&
      !ctx.input.includeDocumentFolders &&
      !ctx.input.includePhotoVideoTags &&
      !ctx.input.includeAccountTypes;

    if (ctx.input.includeGeneral || noSpecificSelection) {
      output.general = await client.getCompanySettings();
      parts.push('general settings');
    }

    let toArray = (result: any) =>
      Array.isArray(result) ? result : (result?.items ?? result?.data ?? []);

    if (ctx.input.includeInsuranceCompanies) {
      output.insuranceCompanies = toArray(await client.getInsuranceCompanies());
      parts.push('insurance companies');
    }
    if (ctx.input.includeJobCategories) {
      output.jobCategories = toArray(await client.getJobCategories());
      parts.push('job categories');
    }
    if (ctx.input.includeTradeTypes) {
      output.tradeTypes = toArray(await client.getTradeTypes());
      parts.push('trade types');
    }
    if (ctx.input.includeWorkTypes) {
      output.workTypes = toArray(await client.getWorkTypes());
      parts.push('work types');
    }
    if (ctx.input.includeLeadSources) {
      output.leadSources = toArray(await client.getLeadSources());
      parts.push('lead sources');
    }
    if (ctx.input.includeDocumentFolders) {
      output.documentFolders = toArray(await client.getDocumentFolders());
      parts.push('document folders');
    }
    if (ctx.input.includePhotoVideoTags) {
      output.photoVideoTags = toArray(await client.getPhotoVideoTags());
      parts.push('photo/video tags');
    }
    if (ctx.input.includeAccountTypes) {
      output.accountTypes = toArray(await client.getAccountTypes());
      parts.push('account types');
    }

    return {
      output: output as any,
      message: `Retrieved company settings: ${parts.join(', ')}.`
    };
  })
  .build();
