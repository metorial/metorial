import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  key: 'get_template',
  name: 'Get Template',
  description:
    'Read a reusable Pod or Serverless template, including image, environment, ports, command, and storage configuration. Call list_templates to discover template IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({ templateId: z.string().min(1).describe('Template ID from list_templates.') })
  )
  .output(
    z.object({
      templateId: z.string(),
      name: z.string().nullable(),
      imageName: z.string().nullable(),
      isServerless: z.boolean().nullable(),
      isPublic: z.boolean().nullable(),
      env: z.record(z.string(), z.string()).nullable(),
      ports: z.array(z.string()).nullable(),
      containerDiskInGb: z.number().nullable(),
      volumeInGb: z.number().nullable(),
      volumeMountPath: z.string().nullable(),
      dockerEntrypoint: z.array(z.string()).nullable(),
      dockerStartCmd: z.array(z.string()).nullable(),
      containerRegistryAuthId: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let template = await new RunPodClient(ctx.auth).getTemplate(ctx.input.templateId);
    let output = {
      templateId: template.id,
      name: template.name ?? null,
      imageName: template.imageName ?? null,
      isServerless: template.isServerless ?? null,
      isPublic: template.isPublic ?? null,
      env: template.env ?? null,
      ports: template.ports ?? null,
      containerDiskInGb: template.containerDiskInGb ?? null,
      volumeInGb: template.volumeInGb ?? null,
      volumeMountPath: template.volumeMountPath ?? null,
      dockerEntrypoint: template.dockerEntrypoint ?? null,
      dockerStartCmd: template.dockerStartCmd ?? null,
      containerRegistryAuthId: template.containerRegistryAuthId ?? null
    };
    return { output, message: `Retrieved template ${output.name ?? output.templateId}.` };
  })
  .build();
