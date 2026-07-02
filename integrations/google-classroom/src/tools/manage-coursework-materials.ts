import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let materialAttachmentSchema = z.object({
  driveFile: z
    .object({
      driveFile: z
        .object({
          driveId: z.string().optional(),
          title: z.string().optional(),
          alternateLink: z.string().optional()
        })
        .optional(),
      shareMode: z.enum(['STUDENT_COPY', 'VIEW', 'EDIT']).optional()
    })
    .optional(),
  youtubeVideo: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      alternateLink: z.string().optional()
    })
    .optional(),
  link: z
    .object({
      url: z.string().optional(),
      title: z.string().optional()
    })
    .optional(),
  form: z
    .object({
      formUrl: z.string().optional(),
      title: z.string().optional()
    })
    .optional()
});

let courseWorkMaterialSchema = z.object({
  courseWorkMaterialId: z.string().optional().describe('ID of the material'),
  courseId: z.string().optional().describe('Course ID'),
  title: z.string().optional().describe('Title'),
  description: z.string().optional().describe('Description'),
  state: z.string().optional().describe('State (PUBLISHED, DRAFT, DELETED)'),
  topicId: z.string().optional().describe('Associated topic ID'),
  alternateLink: z.string().optional().describe('URL to the material'),
  creationTime: z.string().optional().describe('Creation time'),
  updateTime: z.string().optional().describe('Last update time')
});

export let manageCourseworkMaterials = SlateTool.create(spec, {
  name: 'Manage Coursework Materials',
  key: 'manage_coursework_materials',
  description: `Create, list, update, or delete coursework materials in a Google Classroom course. Materials are educational resources (links, Drive files, videos) shared with students without requiring submission.`,
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.manageCourseworkMaterials)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform'),
      materialId: z
        .string()
        .optional()
        .describe('Material ID (required for get, update, delete)'),
      title: z.string().optional().describe('Title of the material (required for create)'),
      description: z.string().optional().describe('Description of the material'),
      state: z.enum(['PUBLISHED', 'DRAFT']).optional().describe('State of the material'),
      topicId: z.string().optional().describe('Topic to assign the material to'),
      materials: z.array(materialAttachmentSchema).optional().describe('Material attachments'),
      assigneeMode: z.enum(['ALL_STUDENTS', 'INDIVIDUAL_STUDENTS']).optional(),
      individualStudentIds: z.array(z.string()).optional(),
      pageSize: z.number().optional().describe('Maximum results (for list)'),
      pageToken: z.string().optional().describe('Token for next page (for list)')
    })
  )
  .output(
    z.object({
      material: courseWorkMaterialSchema.optional().describe('The material'),
      materials: z.array(courseWorkMaterialSchema).optional().describe('List of materials'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      success: z.boolean().optional().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let { courseId, action, materialId } = ctx.input;

    let mapMaterial = (m: any) => ({
      courseWorkMaterialId: m.id,
      courseId: m.courseId,
      title: m.title,
      description: m.description,
      state: m.state,
      topicId: m.topicId,
      alternateLink: m.alternateLink,
      creationTime: m.creationTime,
      updateTime: m.updateTime
    });

    if (action === 'list') {
      let result = await client.listCourseWorkMaterials(courseId, {
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });
      let materials = (result.courseWorkMaterial || []).map(mapMaterial);
      return {
        output: { materials, nextPageToken: result.nextPageToken, success: true },
        message: `Found **${materials.length}** coursework material(s).`
      };
    }

    if (action === 'get') {
      if (!materialId) throw new Error('materialId is required');
      let result = await client.getCourseWorkMaterial(courseId, materialId);
      return {
        output: { material: mapMaterial(result), success: true },
        message: `Retrieved material **${result.title}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.title) throw new Error('title is required for creating a material');
      let body: Record<string, any> = { title: ctx.input.title };
      if (ctx.input.description) body.description = ctx.input.description;
      if (ctx.input.state) body.state = ctx.input.state;
      if (ctx.input.topicId) body.topicId = ctx.input.topicId;
      if (ctx.input.materials) body.materials = ctx.input.materials;
      if (ctx.input.assigneeMode) {
        body.assigneeMode = ctx.input.assigneeMode;
        if (
          ctx.input.assigneeMode === 'INDIVIDUAL_STUDENTS' &&
          ctx.input.individualStudentIds
        ) {
          body.individualStudentsOptions = { studentIds: ctx.input.individualStudentIds };
        }
      }
      let result = await client.createCourseWorkMaterial(courseId, body);
      return {
        output: { material: mapMaterial(result), success: true },
        message: `Created material **${result.title}** (${result.state}).`
      };
    }

    if (action === 'update') {
      if (!materialId) throw new Error('materialId is required');
      let updateFields: Record<string, any> = {};
      let maskParts: string[] = [];
      if (ctx.input.title !== undefined) {
        updateFields.title = ctx.input.title;
        maskParts.push('title');
      }
      if (ctx.input.description !== undefined) {
        updateFields.description = ctx.input.description;
        maskParts.push('description');
      }
      if (ctx.input.state !== undefined) {
        updateFields.state = ctx.input.state;
        maskParts.push('state');
      }
      if (ctx.input.topicId !== undefined) {
        updateFields.topicId = ctx.input.topicId;
        maskParts.push('topicId');
      }
      if (ctx.input.materials !== undefined) {
        updateFields.materials = ctx.input.materials;
        maskParts.push('materials');
      }

      let result = await client.updateCourseWorkMaterial(
        courseId,
        materialId,
        updateFields,
        maskParts.join(',')
      );
      return {
        output: { material: mapMaterial(result), success: true },
        message: `Updated material **${result.title}**.`
      };
    }

    if (action === 'delete') {
      if (!materialId) throw new Error('materialId is required');
      await client.deleteCourseWorkMaterial(courseId, materialId);
      return {
        output: { success: true },
        message: `Deleted material \`${materialId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
