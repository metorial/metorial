import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { spec } from '../spec';

export let getTechStack = SlateTool.create(spec, {
  name: 'Get Tech Stack',
  key: 'get_tech_stack',
  description: `Detects and returns the technology stack used by a website. Identifies frameworks, CMS platforms, analytics tools, hosting providers, and other technologies powering the given domain.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL or domain to detect the tech stack for')
    })
  )
  .output(
    z.object({
      technologies: z
        .array(z.string())
        .describe('List of technology identifiers used by the website')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.techStack(ctx.input.url);

    let tech = result.objects?.company?.tech ?? [];

    let output = {
      technologies: Array.isArray(tech) ? tech : []
    };

    return {
      output,
      message:
        output.technologies.length > 0
          ? `Detected **${output.technologies.length}** technologies for **${ctx.input.url}**: ${output.technologies.join(', ')}.`
          : `No technologies detected for **${ctx.input.url}**.`
    };
  })
  .build();
