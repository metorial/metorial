import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let listHandwritingStyles = SlateTool.create(spec, {
  name: 'List Handwriting Styles',
  key: 'list_handwriting_styles',
  description: `Retrieve all available handwriting styles. Styles include Realistic, Bold, AI, and International types (Arabic, Chinese, Cyrillic, Hebrew, Japanese, Korean, Vietnamese).
Each style has an ID that can be referenced when sending mail. AI styles support configurable realism levels and font sizes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      styles: z.array(z.record(z.string(), z.unknown())).describe('List of handwriting styles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });
    let result = await client.listHandwritingStyles();
    let styles = (Array.isArray(result) ? result : result.data || []) as Record<
      string,
      unknown
    >[];

    return {
      output: { styles },
      message: `Retrieved **${styles.length}** handwriting style(s).`
    };
  })
  .build();
