import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

let modelPackageSchema = z.object({
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
  .output(
    z.object({
      modelPackages: z.array(modelPackageSchema).describe('List of model packages'),
      totalCount: z.number().optional().describe('Total number of model packages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let result = await client.listModelPackages({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      searchFor: ctx.input.searchFor
    });

    let items = result.data || result;
    let packages = (Array.isArray(items) ? items : []).map((p: any) => ({
      modelPackageId: p.id || p.modelPackageId,
      name: p.name,
      description: p.description,
      modelId: p.modelId,
      targetName: p.target?.name || p.targetName,
      targetType: p.target?.type || p.targetType,
      registeredModelName: p.registeredModelName,
      createdAt: p.createdAt,
      isArchived: p.isArchived
    }));

    return {
      output: {
        modelPackages: packages,
        totalCount: result.totalCount || result.count || packages.length
      },
      message: `Found **${packages.length}** model package(s) in the registry.`
    };
  })
  .build();
