import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient, responseItems } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let recordSchema = z.record(z.string(), z.any());
let pageInput = z.object({
  offset: z.number().optional().describe('Number of results to skip'),
  limit: z.number().optional().describe('Maximum number of results')
});
let listOutput = z.object({ items: z.array(recordSchema), totalCount: z.number().optional() });

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description: 'Get the user identity associated with the connected DataRobot API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ userId: z.string(), raw: recordSchema }))
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    let user = await client.getCurrentUser();
    return {
      output: parseOutput(z.object({ userId: z.string(), raw: recordSchema }), {
        userId: user.uid,
        raw: user
      }),
      message: 'Retrieved the connected DataRobot user.'
    };
  })
  .build();

export let getModelPackage = SlateTool.create(spec, {
  key: 'get_model_package',
  name: 'Get Model Package',
  description:
    'Retrieve a deployment-ready registered model version, including build status, target, capabilities, and source model information.',
  tags: { readOnly: true }
})
  .input(z.object({ modelPackageId: z.string().describe('Model package ID') }))
  .output(z.object({ modelPackageId: z.string(), raw: recordSchema }))
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    let pkg = await client.getModelPackage(ctx.input.modelPackageId);
    return {
      output: { modelPackageId: pkg.id, raw: pkg },
      message: 'Retrieved the model package.'
    };
  })
  .build();

export let listPredictionServers = SlateTool.create(spec, {
  key: 'list_prediction_servers',
  name: 'List Prediction Servers',
  description:
    'List available prediction server IDs and server metadata for deployment creation. Secret server keys are excluded.',
  tags: { readOnly: true }
})
  .input(pageInput)
  .output(listOutput)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    return {
      output: parseOutput(listOutput, {
        items: await client.listPredictionServers(ctx.input)
      }),
      message: 'Retrieved available prediction servers.'
    };
  })
  .build();

export let listPredictionEnvironments = SlateTool.create(spec, {
  key: 'list_prediction_environments',
  name: 'List Prediction Environments',
  description:
    'List prediction environment IDs and configuration available for deploying model packages.',
  tags: { readOnly: true }
})
  .input(pageInput)
  .output(listOutput)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    let page = await client.listPredictionEnvironments(ctx.input);
    return {
      output: parseOutput(listOutput, {
        items: responseItems(page, 'prediction environments'),
        totalCount: page.totalCount
      }),
      message: 'Retrieved prediction environments.'
    };
  })
  .build();

export let listBlueprints = SlateTool.create(spec, {
  key: 'list_blueprints',
  name: 'List Blueprints',
  description:
    'List model blueprints available for a project, including blueprint IDs and modeling tasks.',
  tags: { readOnly: true }
})
  .input(z.object({ projectId: z.string().describe('Project ID') }))
  .output(listOutput)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    return {
      output: parseOutput(listOutput, {
        items: await client.listBlueprints(ctx.input.projectId)
      }),
      message: 'Retrieved project blueprints.'
    };
  })
  .build();

export let listFeatureLists = SlateTool.create(spec, {
  key: 'list_feature_lists',
  name: 'List Feature Lists',
  description:
    'List the feature lists available in a project, including IDs and selected feature names.',
  tags: { readOnly: true }
})
  .input(z.object({ projectId: z.string().describe('Project ID') }))
  .output(listOutput)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    return {
      output: parseOutput(listOutput, {
        items: await client.listFeatureLists(ctx.input.projectId)
      }),
      message: 'Retrieved project feature lists.'
    };
  })
  .build();
