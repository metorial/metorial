import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customFieldSchema = z
  .object({
    fieldId: z.number().describe('ID of the custom field'),
    fieldValue: z.any().describe('Value to set for the custom field')
  })
  .describe('Custom field value');

let memberSchema = z
  .object({
    emailId: z.string().optional().describe('Email address of the member'),
    userId: z.number().optional().describe('User ID of the member'),
    role: z.string().optional().describe('Role for the member in the project')
  })
  .describe('Project member');

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Creates a new project in Rocketlane. Can optionally associate a customer company, assign an owner, set dates, apply a template, add members, and set custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project'),
      customerCompanyName: z
        .string()
        .optional()
        .describe('Name of the customer company to associate'),
      customerCompanyId: z
        .number()
        .optional()
        .describe('ID of an existing customer company to associate'),
      ownerEmail: z.string().optional().describe('Email of the project owner'),
      ownerId: z.number().optional().describe('User ID of the project owner'),
      startDate: z.string().optional().describe('Project start date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('Project due date in YYYY-MM-DD format'),
      projectDescription: z
        .string()
        .optional()
        .describe('Project description (HTML supported)'),
      templateId: z.number().optional().describe('ID of a template to apply to the project'),
      visibility: z
        .string()
        .optional()
        .describe('Project visibility setting (e.g. "EVERYONE")'),
      fields: z.array(customFieldSchema).optional().describe('Custom field values to set'),
      members: z.array(memberSchema).optional().describe('Members to add to the project')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Unique ID of the created project'),
      projectName: z.string().describe('Name of the project'),
      startDate: z.string().nullable().optional().describe('Project start date'),
      dueDate: z.string().nullable().optional().describe('Project due date'),
      archived: z.boolean().optional().describe('Whether the project is archived'),
      status: z.any().optional().describe('Project status'),
      customer: z.any().optional().describe('Customer company details'),
      owner: z.any().optional().describe('Project owner details'),
      visibility: z.string().optional().describe('Project visibility'),
      progressPercentage: z.number().optional().describe('Project progress percentage')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let customer: { companyName?: string; companyId?: number } | undefined;
    if (ctx.input.customerCompanyName || ctx.input.customerCompanyId) {
      customer = {};
      if (ctx.input.customerCompanyName) customer.companyName = ctx.input.customerCompanyName;
      if (ctx.input.customerCompanyId) customer.companyId = ctx.input.customerCompanyId;
    }

    let owner: { emailId?: string; userId?: number } | undefined;
    if (ctx.input.ownerEmail || ctx.input.ownerId) {
      owner = {};
      if (ctx.input.ownerEmail) owner.emailId = ctx.input.ownerEmail;
      if (ctx.input.ownerId) owner.userId = ctx.input.ownerId;
    }

    let result = await client.createProject({
      projectName: ctx.input.projectName,
      customer,
      owner,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      projectDescription: ctx.input.projectDescription,
      templateId: ctx.input.templateId,
      visibility: ctx.input.visibility,
      fields: ctx.input.fields,
      members: ctx.input.members
    });

    return {
      output: result,
      message: `Project **${result.projectName}** created successfully (ID: ${result.projectId}).`
    };
  })
  .build();
