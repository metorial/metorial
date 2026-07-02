Let me get the CT Search API documentation for completeness.Now let me get the webhook documentation details.I now have all the information needed to write the specification.

# Slates Specification for SSLMate Cert Spotter API

## Overview

SSLMate Cert Spotter is a certificate monitoring service that watches Certificate Transparency (CT) logs to detect SSL/TLS certificates issued for your domains. It alerts users about SSL/TLS certificates issued for their domains, helping detect unauthorized certificates and potential security issues. It also provides a CT Search API for querying certificate issuance data by domain name.

## Authentication

The API supports two methods of authentication, both using an SSLMate API key:

1. **Bearer Token**: Pass the API key as an OAuth2 Bearer Token in the `Authorization` header:

   ```
   Authorization: Bearer 123_sampleapikey
   ```

2. **HTTP Basic Authentication**: Specify your SSLMate API key as the username using HTTP Basic Authentication. Use an empty password.
   ```
   curl -u 123_sampleapikey: https://api.certspotter.com/v1/issuances?domain=example.com
   ```

Your API key can be found on your account page.

The CT Search API can be accessed without authentication for a limited number of queries per day. For high volume production use, a paid plan is required.

## Features

### Certificate Transparency Search

You make an API call to SSLMate with a domain name. SSLMate returns certificates for that domain, with useful certificate fields parsed out in a JSON object. A simple HTTP request returns all known publicly-trusted certificates for a domain name.

- **Include subdomains**: You can optionally request certificates for sub-domains as well, giving you a picture of an entire domain namespace.
- **Incremental monitoring**: You can remember your position in the response, and query for all certificates added to Certificate Transparency since your last query. You don't have to re-download and re-process certificates you've already seen.
- **Deduplication**: When a certificate is issued, it can appear in multiple CT logs, as a regular certificate, a precertificate, or both. The API returns a single entry for each distinct issuance.
- **Expandable fields**: Certain object fields are not included in responses by default. To include such a field, you must specify the field name in the request's expand parameter. Available fields include `dns_names`, `issuer`, `cert`, and more.
- **Firehose access**: Access a continuous stream of all certificate issuances as they are recorded in Certificate Transparency logs. Requires a subscription to Firehose Access.

### Domain Monitoring Management

The monitored domains API allows you to add, remove, and configure the domains monitored by Cert Spotter.

- You can monitor an entire domain tree (including all sub-domains) by prefixing the domain name with a dot (e.g., `.example.com`), or monitor a single DNS name without the prefix.
- If a field is omitted, then it is set to the specified default (in the case of a new object), or the existing value is left as-is (in the case of an existing object).
- Domains can be enabled or disabled without removing them.

### Certificate Authorization

You can leverage this feature to distinguish between certificates that are issued through your authorized channels and certificates that might be evidence of shadow IT or cyberattacks. Cert Spotter does not notify you about known certificates, reducing alert fatigue from routine renewals of legitimate certificates.

- **Authorize by certificate**: Upload a PEM-encoded certificate to mark it as known/authorized.
- **Authorize by public key**: It is recommended to authorize public keys instead, by uploading CSRs to Cert Spotter before you submit them to your certificate authority. Accepts PEM-encoded CSRs, DER-encoded CSRs, or JSON objects with a public key hash.
- When you authorize a public key, you must specify which DNS names are authorized to use the key. Cert Spotter will still notify you about certificates that use the key if they are valid for other DNS names.

## Events

Cert Spotter supports webhooks for event-driven notifications. You can configure Cert Spotter to invoke a webhook when certain events take place.

### Unknown Certificate Detected

Fired when Cert Spotter detects an unknown (unauthorized) certificate for one of your monitored domains. The payload includes the certificate issuance ID, affected endpoints, and full issuance details such as DNS names, issuer information, validity dates, and the raw certificate.

### New Endpoint Discovered (Beta)

Fired when Cert Spotter discovers a new endpoint (subdomain) for one of your monitored domains. The payload includes the DNS name of the endpoint and the matching monitored domain. This event type is currently in beta and must be enabled by contacting SSLMate support.
