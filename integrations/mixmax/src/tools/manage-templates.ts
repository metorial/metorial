import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailRecipientSchema = z.object({
  email: z.string().describe('Recipient email address'),
  name: z.string().optional().describe('Recipient display name')
});

let templateSchema = z.object({
  templateId: z.string().describe('Template ID'),
  name: z.string().optional().describe('Template name'),
  subject: z.string().optional().describe('Email subject line'),
  body: z.string().optional().describe('Template body (HTML)')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List and search reusable email templates (snippets). Templates can be filtered by name using the search parameter. Use operators like \`name:"my template"\` for exact matching.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter templates by name'),
      limit: z.number().optional().describe('Maximum number of results (default: 50)'),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema).describe('List of templates'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasNext: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listSnippets({
      search: ctx.input.search,
      limit: ctx.input.limit,
      next: ctx.input.cursor
    });

    let results = data.results || data || [];
    let templates = results.map((t: any) => ({
      templateId: t._id,
      name: t.name,
      subject: t.subject,
      body: t.body
    }));

    return {
      output: {
        templates,
        nextCursor: data.next,
        hasNext: data.hasNext
      },
      message: `Found ${templates.length} template(s).`
    };
  })
  .build();

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a specific email template by its ID. Returns the full template including name, subject, and body content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let t = await client.getSnippet(ctx.input.templateId);

    return {
      output: {
        templateId: t._id,
        name: t.name,
        subject: t.subject,
        body: t.body
      },
      message: `Retrieved template "${t.name}".`
    };
  })
  .build();

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing email template's name, subject, or body content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      name: z.string().optional().describe('New template name'),
      subject: z.string().optional().describe('New email subject'),
      body: z.string().optional().describe('New template body (HTML)')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updates: Record<string, any> = {};
    if (ctx.input.name !== undefined) updates.name = ctx.input.name;
    if (ctx.input.subject !== undefined) updates.subject = ctx.input.subject;
    if (ctx.input.body !== undefined) updates.body = ctx.input.body;

    let t = await client.updateSnippet(ctx.input.templateId, updates);

    return {
      output: {
        templateId: t._id,
        name: t.name,
        subject: t.subject,
        body: t.body
      },
      message: `Template "${t.name}" updated.`
    };
  })
  .build();

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete an email template.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the template was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteSnippet(ctx.input.templateId);

    return {
      output: { success: true },
      message: `Template ${ctx.input.templateId} deleted.`
    };
  })
  .build();

export let sendTemplate = SlateTool.create(spec, {
  name: 'Send Template',
  key: 'send_template',
  description: `Send an email using a saved template. Auto-replaces standard variables ({{first name}}, {{last name}}, {{email}}, {{sender name}}, etc.). Custom variables can be provided via the variables parameter.`,
  instructions: [
    'Custom variables must be resolved before sending. If the template contains unresolved custom variables, the API will return a 400 error.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to send'),
      to: z.array(emailRecipientSchema).min(1).describe('Primary recipients'),
      cc: z.array(emailRecipientSchema).optional().describe('CC recipients'),
      bcc: z.array(emailRecipientSchema).optional().describe('BCC recipients'),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom template variables to resolve (e.g., {"company": "Acme"})')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the email was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.sendSnippet(ctx.input.templateId, {
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      variables: ctx.input.variables
    });

    return {
      output: { success: true },
      message: `Template sent to ${ctx.input.to.map(r => r.email).join(', ')}.`
    };
  })
  .build();
