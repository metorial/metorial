import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.string().describe('Unique identifier'),
  name: z.string().nullable().describe('Template name'),
  imageName: z.string().nullable().describe('Container image'),
  category: z.string().nullable().describe('Category: NVIDIA, AMD, or CPU'),
  isPublic: z.boolean().nullable().describe('Whether template is public'),
  isServerless: z
    .boolean()
    .nullable()
    .describe('Whether template is for Serverless endpoints'),
  containerDiskInGb: z
    .number()
    .refine(Number.isInteger, 'Must be an integer.')
    .min(1)
    .nullable()
    .describe('Container disk in GB'),
  volumeInGb: z
    .number()
    .refine(Number.isInteger, 'Must be an integer.')
    .min(10)
    .nullable()
    .describe('Volume size in GB'),
  volumeMountPath: z.string().nullable().describe('Volume mount path')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List templates in your Runpod account. Templates define reusable Pod and endpoint configurations including container images, environment variables, and resource requirements. Optionally include public and Runpod-provided templates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includePublicTemplates: z
        .boolean()
        .optional()
        .describe('Include community-made public templates'),
      includeRunpodTemplates: z
        .boolean()
        .optional()
        .describe('Include official Runpod templates'),
      includeEndpointBoundTemplates: z
        .boolean()
        .optional()
        .describe('Retained for compatibility; current API lists all owned templates.')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema).describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let result = await client.listTemplates({
      includePublicTemplates: ctx.input.includePublicTemplates,
      includeRunpodTemplates: ctx.input.includeRunpodTemplates,
      includeEndpointBoundTemplates: ctx.input.includeEndpointBoundTemplates
    });

    let templates = Array.isArray(result) ? result : [];

    let mapped = templates.map((t: any) => ({
      templateId: t.id,
      name: t.name ?? null,
      imageName: t.imageName ?? null,
      category: t.category ?? null,
      isPublic: t.isPublic ?? null,
      isServerless: t.isServerless ?? null,
      containerDiskInGb: t.containerDiskInGb ?? null,
      volumeInGb: t.volumeInGb ?? null,
      volumeMountPath: t.volumeMountPath ?? null
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** template(s).`
    };
  })
  .build();
