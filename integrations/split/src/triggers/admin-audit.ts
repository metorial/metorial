import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let adminAudit = SlateTrigger.create(spec, {
  name: 'Admin Audit Log',
  key: 'admin_audit',
  description:
    'Triggers on admin-level configuration changes such as project, environment, API key, traffic type, user, group, or security setting modifications. Configure the "Outgoing webhook (Admin audit log)" integration in Split UI to point to this trigger\'s URL.'
})
  .input(
    z.object({
      auditId: z.string().describe('Unique ID of the audit log entry.'),
      auditLogType: z
        .string()
        .describe('Object type and change type, e.g., "security_settings.updated".'),
      editorId: z.string().describe('ID of the editor.'),
      editorName: z.string().describe('Name of the editor.'),
      editorType: z.string().describe('Type of editor (e.g., "user").'),
      createdAt: z.number().describe('Millisecond timestamp.'),
      currentObject: z
        .any()
        .optional()
        .describe('Current state of the changed object, null if deleted.'),
      changes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of changed properties with from/to values.')
    })
  )
  .output(
    z.object({
      auditId: z.string().describe('Unique audit log entry ID.'),
      auditLogType: z
        .string()
        .describe('Change type identifier (e.g., "environment.created").'),
      editorName: z.string().describe('Who made the change.'),
      editorType: z.string().describe('Editor type.'),
      createdAt: z.number().describe('When the change happened (millisecond timestamp).'),
      changes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Changed properties with before/after values.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            auditId: body.id ?? '',
            auditLogType: body.auditLogType ?? '',
            editorId: body.editor?.id ?? '',
            editorName: body.editor?.name ?? '',
            editorType: body.editor?.type ?? '',
            createdAt: body.createdAt ?? 0,
            currentObject: body.currentObject ?? null,
            changes: body.changes ?? {}
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `admin.${ctx.input.auditLogType}`,
        id: ctx.input.auditId,
        output: {
          auditId: ctx.input.auditId,
          auditLogType: ctx.input.auditLogType,
          editorName: ctx.input.editorName,
          editorType: ctx.input.editorType,
          createdAt: ctx.input.createdAt,
          changes: ctx.input.changes
        }
      };
    }
  })
  .build();
