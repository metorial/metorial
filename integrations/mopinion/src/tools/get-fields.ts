import { SlateTool } from 'slates';
import { z } from 'zod';
import { MopinionClient } from '../lib/client';
import { spec } from '../spec';

export let getFields = SlateTool.create(spec, {
  name: 'Get Fields',
  key: 'get_fields',
  description: `Retrieve field definitions (questions and metadata fields) for a Mopinion report or dataset. Useful for understanding the structure of collected feedback data before querying feedback entries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z.number().optional().describe('Report ID to retrieve fields from'),
      datasetId: z.number().optional().describe('Dataset ID to retrieve fields from')
    })
  )
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            key: z.string().describe('Field key/identifier'),
            label: z.string().describe('Field label/question text'),
            shortLabel: z.string().optional().describe('Short label for the field'),
            type: z.string().describe('Field type (e.g., text, number, rating)'),
            datasetId: z.number().optional().describe('Dataset ID the field belongs to'),
            reportId: z.number().optional().describe('Report ID the field belongs to'),
            answerOptions: z
              .any()
              .optional()
              .describe('Available answer options for the field'),
            answerValues: z.array(z.string()).optional().describe('Possible answer values')
          })
        )
        .describe('List of field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MopinionClient({
      publicKey: ctx.auth.publicKey,
      signatureToken: ctx.auth.signatureToken
    });

    if (!ctx.input.reportId && !ctx.input.datasetId) {
      throw new Error('Either reportId or datasetId must be provided');
    }

    let result: any;

    if (ctx.input.reportId) {
      result = await client.getReportFields(ctx.input.reportId);
    } else {
      result = await client.getDatasetFields(ctx.input.datasetId!);
    }

    let fieldData = Array.isArray(result) ? result : result.data || [];

    let fields = fieldData.map((f: any) => ({
      key: f.key || '',
      label: f.label || '',
      shortLabel: f.shortLabel ?? f.short_label,
      type: f.type || '',
      datasetId: f.datasetId ?? f.dataset_id,
      reportId: f.reportId ?? f.report_id,
      answerOptions: f.answerOptions ?? f.answer_options,
      answerValues: f.answerValues ?? f.answer_values ?? []
    }));

    return {
      output: { fields },
      message: `Retrieved **${fields.length}** field definitions.`
    };
  })
  .build();
