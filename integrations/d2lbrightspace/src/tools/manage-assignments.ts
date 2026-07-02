import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let assignmentSchema = z.object({
  folderId: z.string().describe('Assignment folder ID'),
  name: z.string().optional().describe('Assignment name'),
  categoryId: z.string().optional().describe('Category ID'),
  dueDate: z.string().optional().describe('Due date'),
  instructions: z.string().optional().describe('Assignment instructions'),
  isHidden: z.boolean().optional().describe('Whether hidden'),
  submissionType: z
    .number()
    .optional()
    .describe('Submission type (0=File, 1=Text, 2=OnPaper, 3=Observed, 4=FileOrText)'),
  dropboxType: z.number().optional().describe('Dropbox type (1=Group, 2=Individual)')
});

export let listAssignments = SlateTool.create(spec, {
  name: 'List Assignments',
  key: 'list_assignments',
  description: `List all assignment (dropbox) folders in a course. Returns folder details including name, due date, instructions, and submission type.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID')
    })
  )
  .output(
    z.object({
      assignments: z.array(assignmentSchema).describe('List of assignments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.listDropboxFolders(ctx.input.orgUnitId);

    let items = Array.isArray(result) ? result : [];
    let assignments = items.map((a: any) => ({
      folderId: String(a.Id),
      name: a.Name,
      categoryId: a.CategoryId ? String(a.CategoryId) : undefined,
      dueDate: a.DueDate,
      instructions: a.CustomInstructions?.Text || a.CustomInstructions?.Content,
      isHidden: a.IsHidden,
      submissionType: a.SubmissionType,
      dropboxType: a.DropboxType
    }));

    return {
      output: { assignments },
      message: `Found **${assignments.length}** assignment(s) in org unit ${ctx.input.orgUnitId}.`
    };
  })
  .build();

export let getAssignment = SlateTool.create(spec, {
  name: 'Get Assignment',
  key: 'get_assignment',
  description: `Get detailed information about a specific assignment folder, including its instructions, due date, assessment settings, and availability.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      folderId: z.string().describe('Assignment folder ID')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('Assignment folder ID'),
      name: z.string().optional().describe('Assignment name'),
      dueDate: z.string().optional().describe('Due date'),
      instructions: z.string().optional().describe('Assignment instructions'),
      submissionType: z.number().optional().describe('Submission type'),
      dropboxType: z.number().optional().describe('Dropbox type'),
      isHidden: z.boolean().optional().describe('Whether hidden'),
      startDate: z.string().optional().describe('Availability start date'),
      endDate: z.string().optional().describe('Availability end date'),
      gradeItemId: z.string().optional().describe('Associated grade item ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let a = await client.getDropboxFolder(ctx.input.orgUnitId, ctx.input.folderId);

    return {
      output: {
        folderId: String(a.Id),
        name: a.Name,
        dueDate: a.DueDate,
        instructions: a.CustomInstructions?.Text || a.CustomInstructions?.Content,
        submissionType: a.SubmissionType,
        dropboxType: a.DropboxType,
        isHidden: a.IsHidden,
        startDate: a.Availability?.StartDate,
        endDate: a.Availability?.EndDate,
        gradeItemId: a.Assessment?.GradeItemId ? String(a.Assessment.GradeItemId) : undefined
      },
      message: `Retrieved assignment **${a.Name}** (ID: ${a.Id}).`
    };
  })
  .build();

export let createAssignment = SlateTool.create(spec, {
  name: 'Create Assignment',
  key: 'create_assignment',
  description: `Create a new assignment (dropbox folder) in a course with instructions, due date, and submission settings.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      name: z.string().describe('Assignment name'),
      instructions: z.string().optional().describe('Assignment instructions (HTML supported)'),
      dueDate: z.string().optional().describe('Due date (ISO 8601)'),
      submissionType: z
        .number()
        .optional()
        .default(0)
        .describe('Submission type: 0=File, 1=Text, 2=OnPaper, 3=Observed, 4=FileOrText'),
      isHidden: z.boolean().optional().describe('Whether to hide the assignment'),
      startDate: z.string().optional().describe('Availability start date (ISO 8601)'),
      endDate: z.string().optional().describe('Availability end date (ISO 8601)')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('New assignment folder ID'),
      name: z.string().describe('Assignment name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let folderData: any = {
      Name: ctx.input.name,
      SubmissionType: ctx.input.submissionType ?? 0
    };

    if (ctx.input.instructions) {
      folderData.CustomInstructions = { Content: ctx.input.instructions, Type: 'Html' };
    }
    if (ctx.input.dueDate) folderData.DueDate = ctx.input.dueDate;
    if (ctx.input.isHidden !== undefined) folderData.IsHidden = ctx.input.isHidden;
    if (ctx.input.startDate || ctx.input.endDate) {
      folderData.Availability = {};
      if (ctx.input.startDate) folderData.Availability.StartDate = ctx.input.startDate;
      if (ctx.input.endDate) folderData.Availability.EndDate = ctx.input.endDate;
    }

    let result = await client.createDropboxFolder(ctx.input.orgUnitId, folderData);

    return {
      output: {
        folderId: String(result.Id),
        name: result.Name
      },
      message: `Created assignment **${result.Name}** (ID: ${result.Id}).`
    };
  })
  .build();

export let getAssignmentSubmissions = SlateTool.create(spec, {
  name: 'Get Assignment Submissions',
  key: 'get_assignment_submissions',
  description: `Retrieve submissions for an assignment. Optionally filter by a specific user.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      folderId: z.string().describe('Assignment folder ID'),
      userId: z.string().optional().describe('Filter submissions by user ID')
    })
  )
  .output(
    z.object({
      submissions: z
        .array(
          z.object({
            submissionId: z.string().optional().describe('Submission ID'),
            userId: z.string().optional().describe('Submitter user ID'),
            displayName: z.string().optional().describe('Submitter display name'),
            status: z
              .number()
              .optional()
              .describe('Status (0=Unsubmitted, 1=Submitted, 2=Draft, 3=Published)'),
            completionDate: z.string().optional().describe('Completion date'),
            fileCount: z.number().optional().describe('Number of submitted files')
          })
        )
        .describe('List of submissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result: any;
    if (ctx.input.userId) {
      result = await client.getDropboxUserSubmissions(
        ctx.input.orgUnitId,
        ctx.input.folderId,
        ctx.input.userId
      );
    } else {
      result = await client.getDropboxSubmissions(ctx.input.orgUnitId, ctx.input.folderId);
    }

    let items = Array.isArray(result) ? result : [];
    let submissions = items.map((s: any) => ({
      submissionId: s.Id ? String(s.Id) : undefined,
      userId: s.Entity?.EntityId ? String(s.Entity.EntityId) : undefined,
      displayName: s.Entity?.DisplayName,
      status: s.Status,
      completionDate: s.CompletionDate,
      fileCount: s.Submissions?.length || 0
    }));

    return {
      output: { submissions },
      message: `Found **${submissions.length}** submission(s) for assignment ${ctx.input.folderId}.`
    };
  })
  .build();
