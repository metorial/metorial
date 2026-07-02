import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { requireRedditInput } from '../lib/errors';
import { spec } from '../spec';

export let manageFlair = SlateTool.create(spec, {
  name: 'Manage Flair',
  key: 'manage_flair',
  description: `Get available flair options for a subreddit, or set user/post flair.
Retrieve both user flair and link (post) flair templates, or assign flair to users and posts.`
})
  .input(
    z.object({
      action: z
        .enum(['list_user_flairs', 'list_post_flairs', 'set_user_flair', 'set_post_flair'])
        .describe('Flair action to perform'),
      subredditName: z.string().describe('Subreddit name (without r/ prefix)'),
      username: z.string().optional().describe('Username for set_user_flair'),
      postId: z.string().optional().describe('Post fullname for set_post_flair (t3_*)'),
      flairTemplateId: z.string().optional().describe('Flair template ID to use'),
      flairText: z.string().max(64).optional().describe('Custom flair text'),
      cssClass: z.string().optional().describe('CSS class for the flair')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      flairOptions: z
        .array(
          z.object({
            flairTemplateId: z.string().describe('Flair template ID'),
            text: z.string().optional().describe('Flair text'),
            cssClass: z.string().optional().describe('CSS class'),
            textEditable: z.boolean().optional().describe('Whether the text is user-editable'),
            backgroundColor: z.string().optional().describe('Background color'),
            textColor: z.string().optional().describe('Text color (light or dark)')
          })
        )
        .optional()
        .describe('Available flair options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);
    let { action, subredditName } = ctx.input;

    if (action === 'set_user_flair') {
      await client.setUserFlair(subredditName, {
        name: requireRedditInput(
          ctx.input.username,
          'username is required for set_user_flair action'
        ),
        text: ctx.input.flairText,
        flairTemplateId: ctx.input.flairTemplateId,
        cssClass: ctx.input.cssClass
      });
      return {
        output: { success: true },
        message: `Set user flair for u/${ctx.input.username} in r/${subredditName}.`
      };
    }

    if (action === 'set_post_flair') {
      await client.setPostFlair(subredditName, {
        linkFullname: requireRedditInput(
          ctx.input.postId,
          'postId is required for set_post_flair action'
        ),
        text: ctx.input.flairText,
        flairTemplateId: ctx.input.flairTemplateId,
        cssClass: ctx.input.cssClass
      });
      return {
        output: { success: true },
        message: `Set post flair on \`${ctx.input.postId}\` in r/${subredditName}.`
      };
    }

    let data: any[];
    if (action === 'list_user_flairs') {
      data = await client.getUserFlairOptions(subredditName);
    } else {
      data = await client.getLinkFlairOptions(subredditName);
    }

    let flairOptions = (Array.isArray(data) ? data : []).map((f: any) => ({
      flairTemplateId: f.id,
      text: f.text,
      cssClass: f.css_class,
      textEditable: f.text_editable,
      backgroundColor: f.background_color,
      textColor: f.text_color
    }));

    return {
      output: {
        success: true,
        flairOptions
      },
      message: `Found ${flairOptions.length} ${action === 'list_user_flairs' ? 'user' : 'post'} flair options in r/${subredditName}.`
    };
  })
  .build();
