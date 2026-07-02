import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files for an employee or the company. Returns file metadata organized by categories, including file IDs, names, sizes, and dates. Specify an employee ID for employee files, or omit it to list company-level files.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z
        .string()
        .optional()
        .describe('Employee ID to list files for. Omit to list company files.')
    })
  )
  .output(
    z.object({
      categories: z
        .array(z.record(z.string(), z.any()))
        .describe('File categories with their files'),
      scope: z.string().describe('Whether these are "employee" or "company" files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data: any;
    let scope: string;

    if (ctx.input.employeeId) {
      data = await client.listEmployeeFiles(ctx.input.employeeId);
      scope = 'employee';
    } else {
      data = await client.listCompanyFiles();
      scope = 'company';
    }

    let categories = data?.categories || (Array.isArray(data) ? data : []);

    return {
      output: {
        categories,
        scope
      },
      message: `Listed ${scope} files across **${categories.length}** categor${categories.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a file to an employee's file folder or the company file folder. Requires a category ID, file name, and the file content as a string. Specify an employee ID for employee files, or omit it for company files.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z
        .string()
        .optional()
        .describe('Employee ID to upload file for. Omit for company files.'),
      categoryId: z.string().describe('Category ID to upload the file into'),
      fileName: z.string().describe('Name for the file'),
      fileContent: z.string().describe('File content as a text string'),
      shareWithEmployee: z
        .boolean()
        .optional()
        .describe('Whether to share the file with the employee (employee files only)')
    })
  )
  .output(
    z.object({
      scope: z.string().describe('Whether the file was uploaded to "employee" or "company"'),
      fileName: z.string().describe('The name of the uploaded file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    if (ctx.input.employeeId) {
      await client.uploadEmployeeFile(
        ctx.input.employeeId,
        ctx.input.categoryId,
        ctx.input.fileName,
        ctx.input.fileContent,
        ctx.input.shareWithEmployee
      );
    } else {
      await client.uploadCompanyFile(
        ctx.input.categoryId,
        ctx.input.fileName,
        ctx.input.fileContent,
        ctx.input.shareWithEmployee
      );
    }

    return {
      output: {
        scope: ctx.input.employeeId ? 'employee' : 'company',
        fileName: ctx.input.fileName
      },
      message: `Uploaded file **${ctx.input.fileName}** to ${ctx.input.employeeId ? `employee **${ctx.input.employeeId}**` : 'company'} files.`
    };
  })
  .build();

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file from an employee's file folder or the company file folder. Requires the file ID and optionally the employee ID (for employee files).`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('The file ID to delete'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee ID (required for employee files, omit for company files)')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('The deleted file ID'),
      scope: z.string().describe('Whether the file was from "employee" or "company"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    if (ctx.input.employeeId) {
      await client.deleteEmployeeFile(ctx.input.employeeId, ctx.input.fileId);
    } else {
      await client.deleteCompanyFile(ctx.input.fileId);
    }

    return {
      output: {
        fileId: ctx.input.fileId,
        scope: ctx.input.employeeId ? 'employee' : 'company'
      },
      message: `Deleted file **${ctx.input.fileId}** from ${ctx.input.employeeId ? `employee **${ctx.input.employeeId}**` : 'company'} files.`
    };
  })
  .build();
