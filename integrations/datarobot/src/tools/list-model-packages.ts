import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient, responseItems } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let modelPackageSchema = z.object({
  raw: z
    .record(z.string(), z.any())
    .optional()
    .describe('Provider response with credentials removed'),
  modelPackageId: z.string().describe('Unique model package identifier'),
  name: z.string().optional().describe('Model package name'),
  description: z.string().optional().describe('Model package description'),
  modelId: z.string().optional().describe('Source model ID'),
  targetName: z.string().optional().describe('Target variable name'),
  targetType: z.string().optional().describe('Target type (Binary, Regression, etc.)'),
  registeredModelName: z.string().optional().describe('Registered model name'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  isArchived: z.boolean().optional().describe('Whether the package is archived')
});

let outputSchema = z.object({
  modelPackages: z.array(modelPackageSchema).describe('List of model packages'),
  totalCount: z.number().optional().describe('Total number of model packages')
});

export let listModelPackages = SlateTool.create(spec, {
  name: 'List Model Packages',
  key: 'list_model_packages',
  description: `List model packages in the Model Registry. Model packages are deployment-ready bundles that can be deployed, shared, or used to generate compliance documentation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of packages to return'),
      searchFor: z.string().optional().describe('Search string to filter packages')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let result = await client.listModelPackages({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      searchFor: ctx.input.searchFor
    });

    let items = responseItems(result, 'model-packages');
    let packages = items.map((p: any) => ({
      raw: p,
      modelPackageId: p.id ?? p.modelPackageId,
      name: p.name,
      description:
        (p.modelDescription?.description ?? p.description) === null
          ? undefined
          : (p.modelDescription?.description ?? p.description),
      modelId: p.modelId,
      targetName: p.target?.name === null ? undefined : (p.target?.name ?? p.targetName),
      targetType: p.target?.type ?? p.targetType,
      registeredModelName: p.registeredModelName,
      createdAt: p.importMeta?.dateCreated ?? p.createdAt,
      isArchived: p.isArchived
    }));

    return {
      output: parseOutput(outputSchema, {
        modelPackages: packages,
        totalCount: result.totalCount
      }),
      message: `Found **${packages.length}** model package(s) in the registry.`
    };
  })
  .build();
