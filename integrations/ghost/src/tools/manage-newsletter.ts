import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { invalid, resourceId } from '../lib/schemas';
import { spec } from '../spec';

let newsletterOutputSchema = z
  .object({
    sentEmailVerification: z
      .array(z.string())
      .optional()
      .describe('Native fields awaiting verification; emails already sent cannot be undone'),
    newsletterId: z.string().describe('Unique newsletter ID'),
    uuid: z.string().optional().describe('Newsletter UUID'),
    name: z.string().optional().describe('Newsletter name'),
    slug: z.string().optional().describe('URL-friendly slug'),
    description: z.string().nullable().optional().describe('Newsletter description'),
    status: z.string().optional().describe('Newsletter status (active or archived)'),
    senderName: z.string().nullable().optional().describe('Displayed sender name'),
    senderEmail: z.string().nullable().optional().describe('Sender email address'),
    senderReplyTo: z.string().optional().describe('Reply-to setting'),
    subscribeOnSignup: z.boolean().optional().describe('Auto-subscribe new members'),
    visibility: z.string().optional().describe('Newsletter visibility'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp')
  })
  .partial()
  .required({ newsletterId: true });

export let manageNewsletter = SlateTool.create(spec, {
  name: 'Manage Newsletter',
  key: 'manage_newsletter',
  description: `Create, read, or update a newsletter on your Ghost site. Newsletters define how content is distributed via email to members.`,
  instructions: [
    'For **creating**: set `action` to `"create"` and provide at least a `name`.',
    'For **reading**: set `action` to `"read"` and provide `newsletterId`.',
    'For **updating**: set `action` to `"update"`, provide `newsletterId` plus fields to change.',
    'Sender email changes may require validation by Ghost before taking effect.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'read', 'update']).describe('Operation to perform'),
      newsletterId: resourceId.optional().describe('Newsletter ID (required for read/update)'),
      name: z.string().optional().describe('Newsletter name'),
      description: z.string().optional().describe('Newsletter description'),
      status: z.enum(['active', 'archived']).optional().describe('Newsletter status'),
      senderName: z.string().optional().describe('Sender display name'),
      senderEmail: z
        .string()
        .optional()
        .describe('Sender email address (may require validation)'),
      senderReplyTo: z
        .enum(['newsletter', 'support'])
        .optional()
        .describe('Reply-to behavior'),
      subscribeOnSignup: z.boolean().optional().describe('Auto-subscribe new members'),
      titleFontCategory: z
        .enum(['serif', 'sans_serif'])
        .optional()
        .describe('Title font style'),
      bodyFontCategory: z.enum(['serif', 'sans_serif']).optional().describe('Body font style'),
      showHeaderIcon: z.boolean().optional().describe('Show site icon in header'),
      showHeaderTitle: z.boolean().optional().describe('Show site title in header'),
      showHeaderName: z.boolean().optional().describe('Show newsletter name in header'),
      showFeatureImage: z.boolean().optional().describe('Show feature image in emails'),
      showBadge: z.boolean().optional().describe('Show Ghost badge in footer'),
      footerContent: z.string().optional().describe('Custom footer content'),
      headerImage: z.string().optional().describe('Header image URL')
    })
  )
  .output(newsletterOutputSchema)
  .handleInvocation(async ctx => {
    let client = getClient(ctx);

    let { action } = ctx.input;

    if (action === 'read') {
      if (!ctx.input.newsletterId)
        throw invalid('newsletterId is required for reading a newsletter');
      let result = await client.readNewsletter(ctx.input.newsletterId);
      let n = result.newsletters[0];
      return {
        output: {
          ...mapNewsletter(n),
          sentEmailVerification: result.meta?.sent_email_verification
        },
        message: `Retrieved newsletter **"${n.name}"** (${n.status}).`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.status !== undefined) data.status = ctx.input.status;
    if (ctx.input.senderName !== undefined) data.sender_name = ctx.input.senderName;
    if (ctx.input.senderEmail !== undefined) data.sender_email = ctx.input.senderEmail;
    if (ctx.input.senderReplyTo !== undefined) data.sender_reply_to = ctx.input.senderReplyTo;
    if (ctx.input.subscribeOnSignup !== undefined)
      data.subscribe_on_signup = ctx.input.subscribeOnSignup;
    if (ctx.input.titleFontCategory !== undefined)
      data.title_font_category = ctx.input.titleFontCategory;
    if (ctx.input.bodyFontCategory !== undefined)
      data.body_font_category = ctx.input.bodyFontCategory;
    if (ctx.input.showHeaderIcon !== undefined)
      data.show_header_icon = ctx.input.showHeaderIcon;
    if (ctx.input.showHeaderTitle !== undefined)
      data.show_header_title = ctx.input.showHeaderTitle;
    if (ctx.input.showHeaderName !== undefined)
      data.show_header_name = ctx.input.showHeaderName;
    if (ctx.input.showFeatureImage !== undefined)
      data.show_feature_image = ctx.input.showFeatureImage;
    if (ctx.input.showBadge !== undefined) data.show_badge = ctx.input.showBadge;
    if (ctx.input.footerContent !== undefined) data.footer_content = ctx.input.footerContent;
    if (ctx.input.headerImage !== undefined) data.header_image = ctx.input.headerImage;

    if (action === 'create') {
      if (!ctx.input.name) throw invalid('name is required for creating a newsletter');
      let result = await client.createNewsletter(data);
      let n = result.newsletters[0];
      return {
        output: {
          ...mapNewsletter(n),
          sentEmailVerification: result.meta?.sent_email_verification
        },
        message: `Created newsletter **"${n.name}"**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.newsletterId)
        throw invalid('newsletterId is required for updating a newsletter');
      let result = await client.updateNewsletter(ctx.input.newsletterId, data);
      let n = result.newsletters[0];
      return {
        output: {
          ...mapNewsletter(n),
          sentEmailVerification: result.meta?.sent_email_verification
        },
        message: `Updated newsletter **"${n.name}"**.`
      };
    }

    throw invalid(`Unknown action: ${action}`);
  })
  .build();

let mapNewsletter = (n: any) => ({
  newsletterId: n.id,
  uuid: n.uuid,
  name: n.name,
  slug: n.slug,
  description: n.description,
  status: n.status,
  senderName: n.sender_name,
  senderEmail: n.sender_email,
  senderReplyTo: n.sender_reply_to,
  subscribeOnSignup: n.subscribe_on_signup,
  visibility: n.visibility,
  createdAt: n.created_at,
  updatedAt: n.updated_at
});
