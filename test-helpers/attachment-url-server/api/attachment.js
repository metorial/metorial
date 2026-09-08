let jsonResponse = (status, body) =>
  Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store'
    }
  });

export function GET(request) {
  let expectedToken = 'secret123';

  let url = new URL(request.url);
  let headerToken = request.headers.get('x-attachment-token');
  let queryToken = url.searchParams.get('token');

  if (headerToken !== expectedToken || queryToken !== expectedToken) {
    return jsonResponse(401, {
      error: 'invalid_attachment_credentials',
      headerAuthenticated: headerToken === expectedToken,
      queryAuthenticated: queryToken === expectedToken
    });
  }

  let expiresAtValue = url.searchParams.get('expiresAt');
  let expiresAt = expiresAtValue ? Date.parse(expiresAtValue) : Number.NaN;
  if (!Number.isFinite(expiresAt)) {
    return jsonResponse(400, {
      error: 'invalid_expiration',
      message: 'expiresAt must be an ISO-8601 timestamp.'
    });
  }
  if (expiresAt <= Date.now()) {
    return jsonResponse(410, {
      error: 'attachment_url_expired',
      expiresAt: expiresAtValue
    });
  }

  let content = new TextEncoder().encode(
    `Authenticated attachment fetched at ${new Date().toISOString()}\n`
  );

  return new Response(content, {
    headers: {
      'cache-control': 'no-store',
      'content-disposition': 'attachment; filename="authenticated-attachment.txt"',
      'content-type': 'application/octet-stream',
      'x-attachment-authenticated': 'true',
      'x-attachment-expires-at': expiresAtValue
    }
  });
}
