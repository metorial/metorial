import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new personal or commercial (business) lead in AgencyZoom. Personal leads require first and last name. Business leads additionally support company-specific fields like company name, FEIN, business entity type, classification, employee count, annual revenue, and payroll.`,
  instructions: [
    'Set type to "personal" for individual leads or "business" for commercial leads.',
    'Business-specific fields (companyName, fein, businessEntity, etc.) are only used when type is "business".',
    'Optionally assign the lead to a producer, pipeline, stage, or lead source.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z
        .enum(['personal', 'business'])
        .describe(
          'Type of lead to create: "personal" for individual or "business" for commercial'
        ),
      firstName: z.string().describe('First name of the lead contact'),
      lastName: z.string().describe('Last name of the lead contact'),
      email: z.string().optional().describe('Email address of the lead'),
      phone: z.string().optional().describe('Phone number of the lead'),
      agentId: z
        .string()
        .optional()
        .describe('ID of the agent/producer to assign the lead to'),
      pipelineId: z.string().optional().describe('ID of the pipeline to place the lead in'),
      stageId: z.string().optional().describe('ID of the pipeline stage to place the lead at'),
      leadSourceId: z.string().optional().describe('ID of the lead source'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the lead'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs to set on the lead'),
      notes: z.string().optional().describe('Initial note to add to the lead'),
      companyName: z.string().optional().describe('Company name (business leads only)'),
      fein: z
        .string()
        .optional()
        .describe('Federal Employer Identification Number (business leads only)'),
      businessEntity: z
        .string()
        .optional()
        .describe('Business entity type, e.g. LLC, Corporation (business leads only)'),
      classification: z
        .string()
        .optional()
        .describe('Business classification or industry (business leads only)'),
      employeeCount: z
        .number()
        .optional()
        .describe('Number of employees (business leads only)'),
      annualRevenue: z
        .number()
        .optional()
        .describe('Annual revenue in dollars (business leads only)'),
      payroll: z
        .number()
        .optional()
        .describe('Annual payroll in dollars (business leads only)')
    })
  )
  .output(
    z.object({
      lead: z
        .record(z.string(), z.any())
        .describe('The created lead data returned by AgencyZoom')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let data: Record<string, unknown> = {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    };

    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.agentId !== undefined) data.agentId = ctx.input.agentId;
    if (ctx.input.pipelineId !== undefined) data.pipelineId = ctx.input.pipelineId;
    if (ctx.input.stageId !== undefined) data.stageId = ctx.input.stageId;
    if (ctx.input.leadSourceId !== undefined) data.leadSourceId = ctx.input.leadSourceId;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) data.customFields = ctx.input.customFields;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;

    if (ctx.input.type === 'business') {
      if (ctx.input.companyName !== undefined) data.companyName = ctx.input.companyName;
      if (ctx.input.fein !== undefined) data.fein = ctx.input.fein;
      if (ctx.input.businessEntity !== undefined)
        data.businessEntity = ctx.input.businessEntity;
      if (ctx.input.classification !== undefined)
        data.classification = ctx.input.classification;
      if (ctx.input.employeeCount !== undefined) data.employeeCount = ctx.input.employeeCount;
      if (ctx.input.annualRevenue !== undefined) data.annualRevenue = ctx.input.annualRevenue;
      if (ctx.input.payroll !== undefined) data.payroll = ctx.input.payroll;
    }

    let result =
      ctx.input.type === 'business'
        ? await client.createBusinessLead(data)
        : await client.createLead(data);

    let leadData = result.data ?? result;

    return {
      output: {
        lead: leadData
      },
      message: `Created ${ctx.input.type} lead **${ctx.input.firstName} ${ctx.input.lastName}**${(leadData.leadId ?? leadData.id) ? ` (ID: ${leadData.leadId ?? leadData.id})` : ''}.`
    };
  })
  .build();
