import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let importEvents = SlateTrigger.create(spec, {
  name: 'Import Events',
  key: 'import_events',
  description:
    'Triggers when an import event occurs, including import completions, headless imports needing review, and headless import failures. Configure a managed webhook in the Dromo dashboard pointing to the webhook URL.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of event: import_completed, headless_import_needs_review, or headless_import_failed'
        ),
      importId: z.string().describe('ID of the import'),
      filename: z.string().nullable().optional().describe('Original filename'),
      user: z
        .object({
          userId: z.string().optional(),
          name: z.string().optional(),
          email: z.string().optional(),
          companyId: z.string().nullable().optional(),
          companyName: z.string().nullable().optional()
        })
        .optional()
        .describe('User who performed the import'),
      createdDate: z.string().optional().describe('ISO-8601 creation timestamp'),
      importType: z.string().optional().describe('Type of import: EMBEDDED or HEADLESS'),
      status: z.string().optional().describe('Import status'),
      numDataRows: z.number().optional().describe('Number of data rows'),
      developmentMode: z
        .boolean()
        .optional()
        .describe('Whether the import was in development mode'),
      hasData: z.boolean().optional().describe('Whether data is available for retrieval')
    })
  )
  .output(
    z.object({
      importId: z.string().describe('ID of the import'),
      filename: z.string().nullable().optional().describe('Original filename'),
      userName: z.string().optional().describe('Name of the user who performed the import'),
      userEmail: z.string().optional().describe('Email of the user who performed the import'),
      createdDate: z.string().optional().describe('ISO-8601 creation timestamp'),
      importType: z.string().optional().describe('Type of import: EMBEDDED or HEADLESS'),
      status: z.string().optional().describe('Import status'),
      numDataRows: z.number().optional().describe('Number of data rows'),
      developmentMode: z
        .boolean()
        .optional()
        .describe('Whether the import was in development mode'),
      hasData: z.boolean().optional().describe('Whether data is available for retrieval')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') ?? '';

      // Basic webhooks send URL-encoded form data with just uploadId
      if (contentType.includes('application/x-www-form-urlencoded')) {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        let uploadId = params.get('uploadId');

        if (!uploadId) {
          return { inputs: [] };
        }

        return {
          inputs: [
            {
              eventType: 'import_completed',
              importId: uploadId,
              filename: null
            }
          ]
        };
      }

      // Managed webhooks send JSON
      let body = (await ctx.request.json()) as {
        event?: string;
        data?: {
          id?: string;
          filename?: string | null;
          user?: {
            id?: string;
            name?: string;
            email?: string;
            company_id?: string | null;
            company_name?: string | null;
          };
          created_date?: string;
          import_type?: string;
          status?: string;
          num_data_rows?: number;
          development_mode?: boolean;
          has_data?: boolean;
        };
      };

      if (!body?.event || !body?.data?.id) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: body.event,
            importId: body.data.id,
            filename: body.data.filename ?? null,
            user: body.data.user
              ? {
                  userId: body.data.user.id,
                  name: body.data.user.name,
                  email: body.data.user.email,
                  companyId: body.data.user.company_id,
                  companyName: body.data.user.company_name
                }
              : undefined,
            createdDate: body.data.created_date,
            importType: body.data.import_type,
            status: body.data.status,
            numDataRows: body.data.num_data_rows,
            developmentMode: body.data.development_mode,
            hasData: body.data.has_data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.importId}-${ctx.input.eventType}`,
        output: {
          importId: ctx.input.importId,
          filename: ctx.input.filename,
          userName: ctx.input.user?.name,
          userEmail: ctx.input.user?.email,
          createdDate: ctx.input.createdDate,
          importType: ctx.input.importType,
          status: ctx.input.status,
          numDataRows: ctx.input.numDataRows,
          developmentMode: ctx.input.developmentMode,
          hasData: ctx.input.hasData
        }
      };
    }
  })
  .build();
