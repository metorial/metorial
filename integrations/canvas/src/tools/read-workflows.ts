import { allOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createCanvasClient } from '../lib/client';
import { spec } from '../spec';

let recordSchema = z.record(z.string(), z.unknown());
let courseIdSchema = z
  .string()
  .describe('Canvas course ID. Call list_courses to discover accessible courses.');

export let whoAmITool = SlateTool.create(spec, {
  key: 'who_am_i',
  name: 'Who Am I',
  description:
    'Get the authenticated Canvas user profile, including the real user ID, name, and available contact information.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ userId: z.string(), profile: recordSchema }))
  .handleInvocation(async ctx => {
    let profile = await createCanvasClient(ctx.auth, ctx.config).getSelf();
    if (profile.id === undefined || profile.id === null) {
      throw createApiServiceError(
        'Canvas did not return a user ID. Reconnect your Canvas account.'
      );
    }
    return {
      output: { userId: String(profile.id), profile },
      message: 'Retrieved the authenticated Canvas user profile.'
    };
  })
  .build();

export let listCourseCreationAccountsTool = SlateTool.create(spec, {
  key: 'list_course_creation_accounts',
  name: 'List Course Creation Accounts',
  description:
    'List accounts in which the authenticated user can create courses. Use the returned account ID with manage_course. Canvas can return an empty list when course creation is unavailable.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ accounts: z.array(recordSchema) }))
  .handleInvocation(async ctx => ({
    message: 'Retrieved Canvas data.',
    output: {
      accounts: await createCanvasClient(ctx.auth, ctx.config).listCourseCreationAccounts()
    }
  }))
  .build();

export let getAssignmentTool = SlateTool.create(spec, {
  key: 'get_assignment',
  name: 'Get Assignment',
  description:
    'Read complete assignment details, optionally including the current user submission and assignment date overrides.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: courseIdSchema,
      assignmentId: z.string().describe('Assignment ID from list_assignments'),
      includeSubmission: z.boolean().optional(),
      includeOverrides: z.boolean().optional()
    })
  )
  .output(z.object({ assignment: recordSchema }))
  .handleInvocation(async ctx => {
    let include: string[] = [];
    if (ctx.input.includeSubmission) include.push('submission');
    if (ctx.input.includeOverrides) include.push('overrides');
    return {
      message: 'Retrieved Canvas assignment details.',
      output: {
        assignment: await createCanvasClient(ctx.auth, ctx.config).getAssignment(
          ctx.input.courseId,
          ctx.input.assignmentId,
          include
        )
      }
    };
  })
  .build();

export let listAssignmentGroupsTool = SlateTool.create(spec, {
  key: 'list_assignment_groups',
  name: 'List Assignment Groups',
  description:
    'List assignment groups with their IDs, names, grading weights, positions, and rules. Use a group ID when creating or moving an assignment.',
  tags: { readOnly: true }
})
  .input(z.object({ courseId: courseIdSchema }))
  .output(z.object({ assignmentGroups: z.array(recordSchema) }))
  .handleInvocation(async ctx => ({
    message: 'Retrieved Canvas data.',
    output: {
      assignmentGroups: await createCanvasClient(ctx.auth, ctx.config).listAssignmentGroups(
        ctx.input.courseId
      )
    }
  }))
  .build();

export let listPagesTool = SlateTool.create(spec, {
  key: 'list_pages',
  name: 'List Pages',
  description:
    'List course wiki pages and their URL slugs. Use a slug with get_page to read its content or manage_page to update it.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: courseIdSchema,
      searchTerm: z.string().optional(),
      published: z.boolean().optional(),
      sort: z.enum(['title', 'created_at', 'updated_at']).optional(),
      order: z.enum(['asc', 'desc']).optional()
    })
  )
  .output(z.object({ pages: z.array(recordSchema) }))
  .handleInvocation(async ctx => ({
    message: 'Retrieved Canvas data.',
    output: {
      pages: await createCanvasClient(ctx.auth, ctx.config).listPages(
        ctx.input.courseId,
        ctx.input
      )
    }
  }))
  .build();

export let getPageTool = SlateTool.create(spec, {
  key: 'get_page',
  name: 'Get Page',
  description:
    'Read a course wiki page, including its HTML body, publication state, URL, and editing metadata.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: courseIdSchema,
      pageUrl: z.string().describe('Page URL slug or page ID from list_pages')
    })
  )
  .output(z.object({ page: recordSchema }))
  .handleInvocation(async ctx => ({
    message: 'Retrieved Canvas data.',
    output: {
      page: await createCanvasClient(ctx.auth, ctx.config).getPage(
        ctx.input.courseId,
        ctx.input.pageUrl
      )
    }
  }))
  .build();

export let listDiscussionsTool = SlateTool.create(spec, {
  key: 'list_discussions',
  name: 'List Discussions',
  description:
    'List discussion topics or announcements in a course, including topic IDs, bodies, publication state, and grading metadata.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: courseIdSchema,
      searchTerm: z.string().optional(),
      orderBy: z.enum(['position', 'recent_activity', 'title']).optional(),
      filterBy: z.enum(['all', 'unread']).optional(),
      onlyAnnouncements: z.boolean().optional()
    })
  )
  .output(z.object({ discussions: z.array(recordSchema) }))
  .handleInvocation(async ctx => ({
    message: 'Retrieved Canvas data.',
    output: {
      discussions: await createCanvasClient(ctx.auth, ctx.config).listDiscussionTopics(
        ctx.input.courseId,
        ctx.input
      )
    }
  }))
  .build();

export let getDiscussionTool = SlateTool.create(spec, {
  key: 'get_discussion',
  name: 'Get Discussion',
  description:
    'Read the complete metadata and body of a discussion topic or announcement. Topic IDs are available from list_discussions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: courseIdSchema,
      topicId: z.string().describe('Topic ID from list_discussions')
    })
  )
  .output(z.object({ discussion: recordSchema }))
  .handleInvocation(async ctx => ({
    message: 'Retrieved Canvas data.',
    output: {
      discussion: await createCanvasClient(ctx.auth, ctx.config).getDiscussionTopic(
        ctx.input.courseId,
        ctx.input.topicId
      )
    }
  }))
  .build();

export let listModuleItemsTool = SlateTool.create(spec, {
  key: 'list_module_items',
  name: 'List Module Items',
  description:
    'List every item in a course module, including linked content IDs, page slugs, URLs, positions, and completion requirements.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: courseIdSchema,
      moduleId: z.string().describe('Module ID from list_modules'),
      includeContentDetails: z.boolean().optional()
    })
  )
  .output(z.object({ items: z.array(recordSchema) }))
  .handleInvocation(async ctx => ({
    message: 'Retrieved Canvas data.',
    output: {
      items: await createCanvasClient(ctx.auth, ctx.config).listModuleItems(
        ctx.input.courseId,
        ctx.input.moduleId,
        ctx.input.includeContentDetails ? ['content_details'] : undefined
      )
    }
  }))
  .build();

export let getConversationTool = SlateTool.create(spec, {
  key: 'get_conversation',
  name: 'Get Conversation',
  description:
    'Read a conversation including message bodies and participants, while leaving its read state unchanged.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      conversationId: z
        .string()
        .describe('Conversation ID from list_conversations or send_message')
    })
  )
  .output(z.object({ conversation: recordSchema }))
  .handleInvocation(async ctx => ({
    message: 'Retrieved Canvas data.',
    output: {
      conversation: await createCanvasClient(ctx.auth, ctx.config).getConversation(
        ctx.input.conversationId
      )
    }
  }))
  .build();

export let getQuizTool = SlateTool.create(spec, {
  key: 'get_quiz',
  name: 'Get Quiz',
  description:
    'Get complete classic Canvas quiz details, including settings, dates, question count, and attempt limits. Does not retrieve New Quizzes.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: courseIdSchema,
      quizId: z.string().describe('Classic quiz ID from list_quizzes')
    })
  )
  .output(z.object({ quiz: recordSchema }))
  .handleInvocation(async ctx => ({
    message: 'Retrieved Canvas data.',
    output: {
      quiz: await createCanvasClient(ctx.auth, ctx.config).getQuiz(
        ctx.input.courseId,
        ctx.input.quizId
      )
    }
  }))
  .build();

export let downloadFileTool = SlateTool.create(spec, {
  key: 'download_file',
  name: 'Download File',
  description:
    'Prepare an authenticated Canvas file download. Returns complete original file metadata, including the provider download URL.',
  tags: { readOnly: true }
})
  .scopes(allOf('url:GET|/api/v1/files/:id', 'url:GET|/files/:file_id/download'))
  .input(
    z.object({
      fileId: z.string().describe('File ID from list_files, module items, or a submission')
    })
  )
  .output(z.object({ file: recordSchema }))
  .handleInvocation(async ctx => {
    let client = createCanvasClient(ctx.auth, ctx.config);
    let file = await client.getFile(ctx.input.fileId);
    if (
      (typeof file.id !== 'string' || !file.id.trim()) &&
      (typeof file.id !== 'number' || !Number.isFinite(file.id))
    ) {
      throw createApiServiceError(
        'Canvas did not return a file ID. Check your file access permissions.'
      );
    }
    await ctx.addAttachment({
      type: 'url',
      url: `https://${client.domain}/files/${encodeURIComponent(String(file.id))}/download`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      mimeType: file['content-type'] || file.content_type,
      filename: file.filename || file.display_name
    });
    return {
      output: { file },
      message: `Prepared ${file.display_name || file.filename || 'file'} for download.`
    };
  })
  .build();
