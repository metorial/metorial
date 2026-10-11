import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

const finiteNumber = (value: unknown) => {
  if (value == null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

export let listModelsTool = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List trained models in a project, including models trained on dataset versions and standalone models such as Neural Architecture Search children. Returns each model's ID, architecture, training status, source version, and evaluation metrics. Call list_projects to discover projects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      group: z
        .string()
        .optional()
        .describe(
          'Neural Architecture Search run identifier; returns only models from that run. Use a group value returned by this tool.'
        )
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelId: z
              .string()
              .describe('Model identifier, such as workspace/project/3 for a version model'),
            name: z.string().optional().describe('Model display name'),
            versionNumber: z
              .number()
              .optional()
              .describe(
                'Source dataset version. It identifies the model for run_inference only when the model has no group.'
              ),
            modelType: z
              .string()
              .optional()
              .describe('Model architecture, such as rfdetr-base'),
            trainingStatus: z
              .string()
              .optional()
              .describe('Training status, such as running, finished, or failed'),
            createdAt: z.string().optional().describe('Creation time reported by Roboflow'),
            map50: z.number().optional().describe('mAP@50 score as a percentage'),
            map5095: z.number().optional().describe('mAP@50-95 score as a percentage'),
            precision: z.number().optional().describe('Precision as a percentage'),
            recall: z.number().optional().describe('Recall as a percentage'),
            f1: z.number().optional().describe('F1 score as a percentage'),
            group: z
              .string()
              .optional()
              .describe('Neural Architecture Search run identifier, when applicable'),
            recommended: z
              .boolean()
              .optional()
              .describe('Whether Roboflow recommends this Neural Architecture Search model')
          })
        )
        .describe('Trained models in the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();
    let data = await client.listModels(workspaceId, ctx.input.projectId, ctx.input.group);

    let rawModels: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.models)
        ? data.models
        : [];
    let models = rawModels
      .filter(model => typeof model?.url === 'string' && model.url)
      .map(model => {
        let metrics = model.metrics && typeof model.metrics === 'object' ? model.metrics : {};
        let versionNumber = Number.parseInt(String(model.version ?? ''), 10);
        return {
          modelId: model.url as string,
          name: typeof model.name === 'string' ? model.name : undefined,
          versionNumber:
            Number.isInteger(versionNumber) && versionNumber > 0 ? versionNumber : undefined,
          modelType: typeof model.modelType === 'string' ? model.modelType : undefined,
          trainingStatus:
            typeof model.train?.status === 'string' ? model.train.status : undefined,
          createdAt:
            typeof model.created === 'string'
              ? model.created
              : typeof model.created === 'number'
                ? new Date(model.created * (model.created < 1e12 ? 1000 : 1)).toISOString()
                : undefined,
          map50: finiteNumber(metrics.map50),
          map5095: finiteNumber(metrics.map5095),
          precision: finiteNumber(metrics.precision),
          recall: finiteNumber(metrics.recall),
          f1: finiteNumber(metrics.f1),
          group: typeof model.group === 'string' ? model.group : undefined,
          recommended: typeof model.recommended === 'boolean' ? model.recommended : undefined
        };
      });

    return {
      output: { models },
      message: `Found **${models.length}** trained model(s) in project **${ctx.input.projectId}**.`
    };
  })
  .build();
