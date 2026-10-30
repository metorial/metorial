import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const recordSchema = z.record(z.string(), z.unknown());
const entitlement =
  'Atlas must be enabled for your organization. Contact Sixtyfour to request access.';
const investigationId = z
  .string()
  .trim()
  .min(1)
  .describe('Investigation ID returned by sixtyfour_atlas_start or sixtyfour_atlas_list.');
const cursor = z
  .string()
  .min(1)
  .max(2048)
  .optional()
  .describe('The next_cursor from the previous page. Omit for the first page.');
const investigationReference = z.object({
  id: z.string(),
  workspace_url: z.string()
});
const summarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['created', 'running', 'stalled', 'completed', 'failed']),
  visibility: z.string(),
  lead_info: recordSchema,
  created_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().nullish(),
  cost_credits: z.number().nullish(),
  workspace_url: z.string(),
  private: z.boolean().optional(),
  shared: z
    .object({
      team_id: z.string().nullish(),
      team_name: z.string().nullish(),
      tier: z.enum(['viewer', 'editor'])
    })
    .nullish()
});
const fileSchema = z.object({
  path: z.string(),
  content_type: z.string().nullish(),
  size_bytes: z.number().int().nonnegative(),
  updated_at: z.string(),
  version: z.number().int(),
  attachment: recordSchema.nullish()
});
const pageSchema = z.object({
  items: z.array(recordSchema),
  next_cursor: z.string().nullish()
});
const parseResponse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError('Sixtyfour returned an unexpected Atlas response.', {
      reason: 'sixtyfour_invalid_atlas_response'
    });
  }
  return parsed.data;
};
const investigationPath = (id: string) => `/v1/atlas/investigations/${encodeURIComponent(id)}`;

export const atlasStart = SlateTool.create(spec, {
  key: 'sixtyfour_atlas_start',
  name: 'Start Atlas Investigation',
  description:
    'Start a deep investigation of a person and return its task ID and research workspace.',
  instructions: [
    'Poll sixtyfour_atlas_status with task_id. The investigation can be inspected while research runs.',
    'Starting research consumes credits. Reuse the same dispatch_id after a lost response to recover the existing run without billing a duplicate.'
  ],
  constraints: [entitlement]
})
  .input(
    z.object({
      lead_info: recordSchema.describe(
        'Known identifiers of the subject, such as name, company, email, or LinkedIn URL.'
      ),
      name: z
        .string()
        .optional()
        .describe('Investigation title; derived from lead_info when omitted.'),
      engine: z
        .enum(['xhigh', 'scout'])
        .optional()
        .describe('Research engine. Defaults to xhigh; scout requires separate access.'),
      research_plan: z
        .string()
        .optional()
        .describe('Plain-language direction for what the investigation should research.'),
      struct: recordSchema
        .optional()
        .describe('Optional target fields and descriptions for the research to answer.'),
      relentless: z
        .boolean()
        .optional()
        .describe(
          'Research until the budget runs out (default true). Set false with struct to stop when every field is answered.'
        ),
      max_credits: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Credit budget from one to ten units of the engine price; defaults to one unit. Pricing is organization-specific.'
        ),
      max_minutes: z
        .number()
        .int()
        .min(10)
        .max(1440)
        .optional()
        .describe('Working-time limit in minutes, excluding retry waits. Omit for no limit.'),
      dispatch_id: z
        .string()
        .min(8)
        .max(128)
        .optional()
        .describe(
          'Client-generated idempotency key. Reuse this exact key when recovering a lost submission response.'
        ),
      private: z
        .boolean()
        .optional()
        .describe(
          'Make the investigation visible only to the API key creator, if the team permits private runs. Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      task_id: z.string().describe('Task ID to pass to sixtyfour_atlas_status.'),
      status: z.string().describe('Current provider task status.'),
      investigation: investigationReference.describe(
        'Persistent investigation ID and provider workspace URL.'
      )
    })
  )
  .handleInvocation(async ctx => {
    if (!Object.keys(ctx.input.lead_info).length) {
      throw createApiServiceError('Provide at least one subject identifier in lead_info.');
    }
    const input = ctx.input;
    const result = await new Client(ctx.auth).post(
      '/v1/atlas/investigations',
      pickDefined({
        lead_info: input.lead_info,
        name: input.name,
        engine: input.engine,
        research_plan: input.research_plan,
        struct: input.struct,
        relentless: input.relentless,
        max_credits: input.max_credits,
        max_minutes: input.max_minutes,
        dispatch_id: input.dispatch_id,
        private: input.private
      })
    );
    const output = parseResponse(
      z.object({
        task_id: z.string(),
        status: z.string(),
        investigation: investigationReference
      }),
      result
    );
    return {
      output,
      message: `Started Atlas investigation ${output.investigation.id}. Poll task ${output.task_id} for completion.`
    };
  })
  .build();

export const atlasStatus = SlateTool.create(spec, {
  key: 'sixtyfour_atlas_status',
  name: 'Get Atlas Task Status',
  description:
    'Check an Atlas research task and retrieve its structured result and credit charge when complete.',
  instructions: [
    'Call with the task_id returned by sixtyfour_atlas_start. Do not resubmit research just because it is still running.'
  ],
  constraints: [entitlement],
  tags: { readOnly: true }
})
  .input(
    z.object({
      task_id: z.string().trim().min(1).describe('Task ID returned by sixtyfour_atlas_start.')
    })
  )
  .output(
    z.object({
      task_id: z.string().describe('Requested task ID.'),
      status: z
        .string()
        .describe(
          'Provider status, including running, completed, failed, cancelled, terminated, continued_as_new, or timed_out.'
        ),
      run_id: z.string().optional().describe('Provider execution ID.'),
      start_time: z.string().optional().describe('When the task started.'),
      close_time: z.string().nullish().describe('When the task ended, if available.'),
      investigation: investigationReference
        .optional()
        .describe('Research workspace associated with the task.'),
      charge_credits: z.number().optional().describe('Credits charged for the completed run.'),
      task_type: z.string().optional().describe('Provider task classification.'),
      result: z
        .object({
          structured_data: recordSchema.optional(),
          confidence_score: z.number().nullish(),
          references: recordSchema.nullish(),
          notes: z.string().nullish(),
          field_confidence: recordSchema.nullish()
        })
        .optional()
        .describe('Completed research fields, confidence, notes and source references.')
    })
  )
  .handleInvocation(async ctx => {
    const response = await new Client(ctx.auth).get(
      `/job-status/${encodeURIComponent(ctx.input.task_id)}`
    );
    const result = parseResponse(
      z.object({
        id: z.string(),
        status: z.string(),
        run_id: z.string().optional(),
        start_time: z.string().optional(),
        close_time: z.string().nullish(),
        investigation: investigationReference.optional(),
        charge_credits: z.number().optional(),
        task_type: z.string().optional(),
        result: z
          .object({
            structured_data: recordSchema.optional(),
            confidence_score: z.number().nullish(),
            references: recordSchema.nullish(),
            notes: z.string().nullish(),
            field_confidence: recordSchema.nullish()
          })
          .optional()
      }),
      response
    );
    const { id, ...rest } = result;
    if (id !== ctx.input.task_id) {
      throw createApiServiceError('Sixtyfour returned a different task than requested.');
    }
    return {
      output: { task_id: id, ...rest },
      message: `Atlas task ${id} is ${result.status}.`
    };
  })
  .build();

export const atlasList = SlateTool.create(spec, {
  key: 'sixtyfour_atlas_list',
  name: 'List Atlas Investigations',
  description:
    'List accessible Atlas investigations, newest first, with workspace links and pagination.',
  instructions: [
    'Use next_cursor as after for the next page. A short or empty page can still have a next_cursor when filtering by status.'
  ],
  constraints: [entitlement],
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum investigations per page, 1–200. Defaults to 50.'),
      after: cursor,
      shared: z
        .enum(['all', 'owned', 'shared'])
        .optional()
        .describe(
          'Include own-team investigations, those shared with the team, or all (default).'
        ),
      status: z
        .enum(['created', 'running', 'stalled', 'completed', 'failed'])
        .optional()
        .describe('Return only investigations in this state.'),
      created_after: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Return investigations created at or after this ISO 8601 timestamp.'),
      created_before: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Return investigations created before this ISO 8601 timestamp.')
    })
  )
  .output(
    z.object({
      investigations: z
        .array(summarySchema)
        .describe('Accessible investigations and their research workspace URLs.'),
      limit: z.number().int().describe('Applied page size.'),
      next_cursor: z
        .string()
        .nullable()
        .describe('Pass as after for the next page; null means the listing is complete.')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    if (
      input.created_after &&
      input.created_before &&
      Date.parse(input.created_after) >= Date.parse(input.created_before)
    ) {
      throw createApiServiceError('created_after must be earlier than created_before.');
    }
    const response = await new Client(ctx.auth).get(
      '/v1/atlas/investigations',
      pickDefined({
        limit: input.limit,
        after: input.after,
        shared: input.shared,
        status: input.status,
        created_after: input.created_after,
        created_before: input.created_before
      })
    );
    const output = parseResponse(
      z.object({
        investigations: z.array(summarySchema),
        limit: z.number().int(),
        next_cursor: z.string().nullable()
      }),
      response
    );
    return {
      output,
      message: `Retrieved ${output.investigations.length} Atlas investigations.`
    };
  })
  .build();

export const atlasInspect = SlateTool.create(spec, {
  key: 'sixtyfour_atlas_inspect',
  name: 'Inspect Atlas Investigation',
  description:
    'Read an investigation summary or one page of findings, attribution links, or workspace file metadata.',
  instructions: [
    'Discover investigation_id with sixtyfour_atlas_list or sixtyfour_atlas_start. Use paths from the files view with sixtyfour_atlas_file.'
  ],
  constraints: [entitlement],
  tags: { readOnly: true }
})
  .input(
    z.object({
      investigation_id: investigationId,
      view: z
        .enum(['summary', 'findings', 'links', 'files'])
        .optional()
        .describe('Information to read; defaults to summary.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Page size for findings, links or files, 1–50. Not used for summary.'),
      after: cursor
    })
  )
  .output(
    z.object({
      investigation_id: z.string().describe('Requested investigation ID.'),
      view: z
        .enum(['summary', 'findings', 'links', 'files'])
        .describe('Information returned.'),
      summary: summarySchema
        .optional()
        .describe('Investigation summary for the summary view.'),
      items: z
        .array(recordSchema)
        .optional()
        .describe('A page of findings, links or file metadata for the selected view.'),
      next_cursor: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Pass as after for the next page in the same view; null means no further page.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    const view = input.view ?? 'summary';
    const client = new Client(ctx.auth);
    const base = investigationPath(input.investigation_id);
    if (view === 'summary') {
      if (input.after !== undefined || input.limit !== undefined) {
        throw createApiServiceError(
          'Pagination applies only to findings, links, or files; omit after and limit for summary.'
        );
      }
      const summary = parseResponse(summarySchema, await client.get(base));
      if (summary.id !== input.investigation_id) {
        throw createApiServiceError(
          'Sixtyfour returned a different investigation than requested.'
        );
      }
      return {
        output: { investigation_id: input.investigation_id, view, summary },
        message: `Atlas investigation ${summary.name} is ${summary.status}.`
      };
    }
    const suffix = view === 'files' ? 'file-entries' : view;
    const response = await client.get(
      `${base}/${suffix}`,
      pickDefined({ limit: input.limit, after: input.after })
    );
    const page = parseResponse(pageSchema, response);
    const items =
      view === 'files' ? page.items.map(item => parseResponse(fileSchema, item)) : page.items;
    return {
      output: {
        investigation_id: input.investigation_id,
        view,
        items,
        next_cursor: page.next_cursor ?? null
      },
      message: `Retrieved ${items.length} ${view} for Atlas investigation ${input.investigation_id}.`
    };
  })
  .build();

export const atlasFile = SlateTool.create(spec, {
  key: 'sixtyfour_atlas_file',
  name: 'Get Atlas Workspace File',
  description:
    'Retrieve a downloadable file from an Atlas research workspace using a path returned by the files view.',
  instructions: [
    'Call sixtyfour_atlas_inspect with view files to discover file paths. The complete file is provided for download.'
  ],
  constraints: [entitlement],
  tags: { readOnly: true }
})
  .input(
    z.object({
      investigation_id: investigationId,
      path: z
        .string()
        .min(1)
        .describe(
          'Exact workspace-relative path returned by sixtyfour_atlas_inspect with view files.'
        )
    })
  )
  .output(
    z.object({
      investigation_id: z.string().describe('Investigation owning the file.'),
      path: z.string().describe('Workspace-relative file path.'),
      filename: z.string().describe('File name.'),
      content_type: z
        .string()
        .nullable()
        .describe('Provider-reported MIME type, when available.'),
      size_bytes: z.number().int().nonnegative().describe('Provider-reported file size.'),
      updated_at: z.string().describe('Last update timestamp.'),
      version: z.number().int().describe('Workspace file version.')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    const segments = input.path.split('/');
    if (
      Array.from(input.path).some(
        character =>
          character === '\\' || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      ) ||
      segments.some(segment => !segment || segment === '.' || segment === '..')
    ) {
      throw createApiServiceError(
        'Use an exact relative file path returned by the investigation files view.'
      );
    }
    const base = investigationPath(input.investigation_id);
    const response = parseResponse(
      z.object({ files: z.array(fileSchema) }),
      await new Client(ctx.auth).get(`${base}/files`)
    );
    const file = response.files.find(entry => entry.path === input.path);
    if (!file) {
      throw createApiServiceError(
        'The requested file is not present in this investigation. Refresh the files view and choose an existing path.'
      );
    }
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.sixtyfour.ai${base}/files/${segments.map(encodeURIComponent).join('/')}`,
      headers: { 'x-api-key': ctx.auth.token },
      mimeType: file.content_type ?? undefined
    });
    return {
      output: {
        investigation_id: input.investigation_id,
        path: file.path,
        filename: segments[segments.length - 1] ?? file.path,
        content_type: file.content_type ?? null,
        size_bytes: file.size_bytes,
        updated_at: file.updated_at,
        version: file.version
      },
      message: `Prepared ${file.path} for download.`
    };
  })
  .build();

export const atlasTools = [atlasStart, atlasStatus, atlasList, atlasInspect, atlasFile];
