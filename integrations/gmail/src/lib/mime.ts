export let buildMimeMessage = (params: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    content: string;
  }>;
}): string => {
  let boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  let lines: string[] = [];

  lines.push(`To: ${params.to.join(', ')}`);
  if (params.cc && params.cc.length > 0) {
    lines.push(`Cc: ${params.cc.join(', ')}`);
  }
  if (params.bcc && params.bcc.length > 0) {
    lines.push(`Bcc: ${params.bcc.join(', ')}`);
  }
  lines.push(`Subject: ${params.subject}`);

  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  if (params.references) {
    lines.push(`References: ${params.references}`);
  }

  let hasAttachments = params.attachments && params.attachments.length > 0;

  if (hasAttachments) {
    lines.push('MIME-Version: 1.0');
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
  }

  let contentType = params.isHtml
    ? 'text/html; charset="UTF-8"'
    : 'text/plain; charset="UTF-8"';

  if (hasAttachments) {
    lines.push(`Content-Type: ${contentType}`);
    lines.push('');
    lines.push(params.body);
  } else {
    lines.push('MIME-Version: 1.0');
    lines.push(`Content-Type: ${contentType}`);
    lines.push('');
    lines.push(params.body);
  }

  if (hasAttachments && params.attachments) {
    for (let attachment of params.attachments) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
      lines.push('Content-Transfer-Encoding: base64');
      lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      lines.push('');
      lines.push(attachment.content);
    }
    lines.push(`--${boundary}--`);
  }

  return lines.join('\r\n');
};

export let encodeBase64Url = (str: string): string => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
