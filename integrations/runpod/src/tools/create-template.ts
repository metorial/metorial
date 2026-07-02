import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a reusable template for Pods or Serverless endpoints. Templates define the container image, environment variables, ports, disk sizes, and other configuration that can be shared across deployments.`,
  instructions: [
    'Set isServerless to true for templates intended for Serverless endpoints.',
    'Template names must be unique.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Unique template name'),
      imageName: z.string().describe('Container image tag'),
      category: z.enum(['NVIDIA', 'AMD', 'CPU']).optional().describe('Hardware category'),
      containerDiskInGb: z.number().optional().describe('Container disk in GB (default: 50)'),
      volumeInGb: z.number().optional().describe('Volume size in GB (default: 20)'),
      volumeMountPath: z.string().optional().describe('Mount path (default: /workspace)'),
      env: z.record(z.string(), z.string()).optional().describe('Environment variables'),
      ports: z
        .array(z.string())
        .optional()
        .describe('Exposed ports, e.g. ["8888/http", "22/tcp"]'),
      dockerEntrypoint: z.array(z.string()).optional().describe('Override Docker ENTRYPOINT'),
      dockerStartCmd: z.array(z.string()).optional().describe('Override Docker CMD'),
      isPublic: z.boolean().optional().describe('Make the template public'),
      isServerless: z.boolean().optional().describe('Template for Serverless endpoints'),
      readme: z.string().optional().describe('Markdown description/documentation'),
      containerRegistryAuthId: z
        .string()
        .optional()
        .describe('Private registry credentials ID')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the created template'),
      name: z.string().nullable().describe('Template name'),
      imageName: z.string().nullable().describe('Container image'),
      isServerless: z.boolean().nullable().describe('Whether for Serverless')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let t = await client.createTemplate({
      name: ctx.input.name,
      imageName: ctx.input.imageName,
      category: ctx.input.category,
      containerDiskInGb: ctx.input.containerDiskInGb,
      volumeInGb: ctx.input.volumeInGb,
      volumeMountPath: ctx.input.volumeMountPath,
      env: ctx.input.env,
      ports: ctx.input.ports,
      dockerEntrypoint: ctx.input.dockerEntrypoint,
      dockerStartCmd: ctx.input.dockerStartCmd,
      isPublic: ctx.input.isPublic,
      isServerless: ctx.input.isServerless,
      readme: ctx.input.readme,
      containerRegistryAuthId: ctx.input.containerRegistryAuthId
    });

    let output = {
      templateId: t.id,
      name: t.name ?? null,
      imageName: t.imageName ?? null,
      isServerless: t.isServerless ?? null
    };

    return {
      output,
      message: `Created template **${output.name ?? output.templateId}** with image \`${output.imageName}\`.`
    };
  })
  .build();
