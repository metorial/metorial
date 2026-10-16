import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { enumNumber, richText } from '../lib/response';
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
      orgUnitId: z
        .string()
        .describe(
          'Course org unit ID. Call list_enrollments or list_org_units to discover IDs.'
        )
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
      name: a.Name ?? undefined,
      categoryId: a.CategoryId ? String(a.CategoryId) : undefined,
      dueDate: a.DueDate ?? undefined,
      instructions: richText(a.CustomInstructions),
      isHidden: a.IsHidden ?? undefined,
      submissionType: enumNumber(a.SubmissionType, {
        File: 0,
        Text: 1,
        OnPaper: 2,
        Observed: 3,
        FileOrText: 4
      }),
      dropboxType: enumNumber(a.DropboxType, { Group: 1, Individual: 2 })
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
      orgUnitId: z
        .string()
        .describe(
          'Course org unit ID. Call list_enrollments or list_org_units to discover IDs.'
        ),
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
        name: a.Name ?? undefined,
        dueDate: a.DueDate ?? undefined,
        instructions: richText(a.CustomInstructions),
        submissionType: enumNumber(a.SubmissionType, {
          File: 0,
          Text: 1,
          OnPaper: 2,
          Observed: 3,
          FileOrText: 4
        }),
        dropboxType: enumNumber(a.DropboxType, { Group: 1, Individual: 2 }),
        isHidden: a.IsHidden ?? undefined,
        startDate: a.Availability?.StartDate ?? undefined,
        endDate: a.Availability?.EndDate ?? undefined,
        gradeItemId: a.GradeItemId == null ? undefined : String(a.GradeItemId)
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
      orgUnitId: z
        .string()
        .describe(
          'Course org unit ID. Call list_enrollments or list_org_units to discover IDs.'
        ),
      name: z.string().describe('Assignment name'),
      instructions: z.string().optional().describe('Assignment instructions (HTML supported)'),
      dueDate: z.string().optional().describe('Due date (ISO 8601)'),
      submissionType: z
        .number()
        .optional()
        .default(0)
        .describe(
          'Submission type: 0=File, 1=Text, 2=OnPaper, 3=Observed, 4=FileOrText. Paper and observed assignments complete on evaluation.'
        ),
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
      SubmissionType: String(ctx.input.submissionType ?? 0),
      DropboxType: '2',
      CompletionType:
        ctx.input.submissionType === 2 || ctx.input.submissionType === 3 ? '3' : '0',
      CustomInstructions: { Content: ctx.input.instructions ?? '', Type: 'Html' },
      CategoryId: null,
      GroupTypeId: null,
      DueDate: ctx.input.dueDate ?? null,
      DisplayInCalendar: false,
      NotificationEmail: null,
      IsHidden: ctx.input.isHidden ?? false,
      Assessment: null,
      IsAnonymous: false,
      GradeItemId: null,
      Availability: null
    };

    if (ctx.input.instructions) {
      folderData.CustomInstructions = { Content: ctx.input.instructions, Type: 'Html' };
    }
    if (ctx.input.dueDate) folderData.DueDate = ctx.input.dueDate;
    if (ctx.input.isHidden !== undefined) folderData.IsHidden = ctx.input.isHidden;
    if (ctx.input.startDate || ctx.input.endDate) {
      folderData.Availability = {};
      folderData.Availability.StartDate = ctx.input.startDate ?? null;
      folderData.Availability.EndDate = ctx.input.endDate ?? null;
    }

    let result = await client.createDropboxFolder(ctx.input.orgUnitId, folderData);

    return {
      output: {
        folderId: String(result.Id),
        name: result.Name ?? undefined
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
      orgUnitId: z
        .string()
        .describe(
          'Course org unit ID. Call list_enrollments or list_org_units to discover IDs.'
        ),
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
            fileCount: z.number().optional().describe('Number of submitted files'),
            entityId: z.string().optional().describe('Submitting user or group ID'),
            entityType: z
              .string()
              .optional()
              .describe('Whether the submitter is a User or Group')
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

    let items = Array.isArray(result) ? result : result?.Entity ? [result] : [];
    let submissions = items.flatMap((entity: any) => {
      let entries = entity.Submissions?.length ? entity.Submissions : [undefined];
      return entries.map((submission: any) => ({
        submissionId: submission?.Id == null ? undefined : String(submission.Id),
        userId:
          entity.Entity?.EntityType === 'User' && entity.Entity.EntityId != null
            ? String(entity.Entity.EntityId)
            : undefined,
        entityId: entity.Entity?.EntityId == null ? undefined : String(entity.Entity.EntityId),
        entityType: entity.Entity?.EntityType ?? undefined,
        displayName: entity.Entity?.DisplayName ?? entity.Entity?.Name ?? undefined,
        status: enumNumber(entity.Status, {
          Unsubmitted: 0,
          Submitted: 1,
          Draft: 2,
          Published: 3
        }),
        completionDate: entity.CompletionDate ?? undefined,
        fileCount: submission?.Files?.length ?? 0
      }));
    });

    return {
      output: { submissions },
      message: `Found **${submissions.length}** submission(s) for assignment ${ctx.input.folderId}.`
    };
  })
  .build();
