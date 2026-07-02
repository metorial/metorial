# DigiCert CertCentral Services API v2 - Comprehensive Research

## Table of Contents

1. [Base URL and Request Structure](#base-url-and-request-structure)
2. [Authentication](#authentication)
3. [Certificate Ordering Endpoints](#certificate-ordering-endpoints)
4. [Certificate Lifecycle Endpoints](#certificate-lifecycle-endpoints)
5. [Domain Management Endpoints](#domain-management-endpoints)
6. [Organization Management Endpoints](#organization-management-endpoints)
7. [User/Account Management Endpoints](#useraccount-management-endpoints)
8. [Webhook Management Endpoints](#webhook-management-endpoints)
9. [Common Response Formats and Pagination](#common-response-formats-and-pagination)
10. [Product Types](#product-types)

---

## Base URL and Request Structure

### Base URLs

| Instance        | Base URL                                       |
| --------------- | ---------------------------------------------- |
| US (Production) | `https://www.digicert.com/services/v2/`        |
| EU (Production) | `https://certcentral.digicert.eu/services/v2/` |
| Beta Server     | `https://beta.digicert.com/services/v2/`       |

Most accounts use the US instance. If your account uses the Europe instance, your CertCentral console displays "CertCentral Europe" in the top left corner.

### Request Format

All API requests are submitted via RESTful URLs using REST features:

- **Protocol:** HTTPS on port 443
- **Character Set:** UTF-8
- **Content Types Supported:**
  - `application/json` (primary)
  - `application/xml`
  - `application/zip`
  - `text/csv` (for list endpoints with ACCEPT header)
  - Image formats: `image/jpeg`, `image/png`

### Required Headers

```
Content-Type: application/json
X-DC-DEVKEY: {{api_key}}
User-Agent: [your application]
Content-Length: [calculated]
```

### Example Request (cURL)

```bash
curl -X GET \
  'https://www.digicert.com/services/v2/user' \
  -H 'Content-Type: application/json' \
  -H 'X-DC-DEVKEY: {{api_key}}'
```

---

## Authentication

### API Key Authentication

DigiCert CertCentral Services API uses header-based authentication via the custom HTTP header `X-DC-DEVKEY`.

### Generating an API Key

1. Sign in to CertCentral
2. Navigate to **Automation > API Keys**
3. Select **Add API Key**
4. Enter a description (e.g., application or user name)
5. Link the key to a user (inherits user's permissions)

### API Key Restrictions (Optional)

| Restriction                    | Allowed Actions                                        |
| ------------------------------ | ------------------------------------------------------ |
| None (default)                 | All actions the linked user can perform                |
| Orders                         | Orders, Requests, Certificates only                    |
| Orders, Domains, Organizations | Orders, Requests, Certificates, Organizations, Domains |
| User Management                | User-related actions only                              |
| View Only                      | GET requests only (no POST, PUT, DELETE)               |

### Service Users

- Service users have API-only access (no console access)
- Recommended for API integrations
- Created via API or CertCentral console
- Receive unique API keys during creation

### Important Notes

- API keys are displayed only once during creation
- No way to retrieve a lost API key
- Lost keys should be revoked and regenerated
- Keys can be edited to update descriptions or permissions

---

## Certificate Ordering Endpoints

### Order OV/EV SSL Certificate

**Endpoint:** `POST https://www.digicert.com/services/v2/order/certificate/{{ssl_certificate_id}}`

**Product Identifiers (replace `{{ssl_certificate_id}}`):**

- `ssl_plus` - Standard SSL
- `ssl_multi_domain` - Multi Domain SSL
- `ssl_wildcard` - Wildcard SSL
- `ssl_ev_plus` - EV SSL
- `ssl_ev_multi_domain` - EV Multi Domain
- `ssl_cloud_wildcard` - Cloud Certificate

**Request Body:**

```json
{
  "certificate": {
    "common_name": "example.com",
    "dns_names": ["www.example.com", "api.example.com"],
    "csr": "-----BEGIN CERTIFICATE REQUEST-----\n...",
    "signature_hash": "sha256",
    "server_platform": {
      "id": 45
    },
    "cert_validity": {
      "days": 365
    }
  },
  "order_validity": {
    "years": 1
  },
  "organization": {
    "id": 12345
  },
  "payment_method": "balance",
  "skip_approval": false,
  "disable_renewal_notifications": false,
  "auto_renew": 0,
  "auto_reissue": 0,
  "dcv_method": "email"
}
```

**Key Parameters:**

| Parameter                        | Type    | Required | Description                               |
| -------------------------------- | ------- | -------- | ----------------------------------------- |
| `certificate.common_name`        | string  | Yes      | Primary domain to secure                  |
| `certificate.dns_names`          | array   | No       | Additional SANs for multi-domain          |
| `certificate.csr`                | string  | Yes      | Certificate Signing Request               |
| `certificate.signature_hash`     | string  | Yes      | Hash algorithm (sha256, sha384, sha512)   |
| `certificate.server_platform.id` | integer | No       | Server platform identifier                |
| `certificate.cert_validity.days` | integer | No       | Certificate validity (max 199 days)       |
| `order_validity.years`           | integer | Yes      | Order duration (1-3 for Multi-year Plans) |
| `organization.id`                | integer | Yes      | Existing organization ID                  |
| `payment_method`                 | string  | Yes      | "balance", "profile", or "card"           |
| `skip_approval`                  | boolean | No       | Skip approval step (default: false)       |
| `dcv_method`                     | string  | No       | Domain validation method                  |
| `disable_ct`                     | boolean | No       | Disable CT logging                        |

**Response (201 Created):**

```json
{
  "id": 123456,
  "certificate_id": 987654,
  "requests": [
    {
      "id": 456789,
      "status": "pending"
    }
  ],
  "domains": [
    {
      "id": 111,
      "name": "example.com",
      "dcv_token": {
        "token": "abc123xyz",
        "status": "pending",
        "expiration_date": "2024-12-31T23:59:59Z"
      }
    }
  ]
}
```

**Order Status Values:**

- `pending` - Awaiting approval
- `submitted` - Submitted for validation
- `approved` - Approved; validation in progress
- `issued` - Certificate issued
- `rejected` - Order rejected
- `revoked` - Certificate revoked

### Order Basic OV (Flex Certificate)

**Endpoint:** `POST https://www.digicert.com/services/v2/order/certificate/ssl_basic`

Flex certificates replace Basic Standard SSL, SSL Multi Domain, and Wildcard products. They support any domain configuration.

**Note:** Must be activated for your account by contacting your account manager.

### Order Secure Site OV (Flex Certificate)

**Endpoint:** `POST https://www.digicert.com/services/v2/order/certificate/ssl_securesite_flex`

Replaces Secure Site SSL, Secure Site Multi-Domain SSL, and Secure Site Wildcard SSL products.

### Multi-year Plans

For orders lasting 1-3 years, use the `order_validity` object:

```json
{
  "order_validity": {
    "years": 3
  },
  "certificate": {
    "cert_validity": {
      "days": 90
    }
  }
}
```

This creates a 3-year plan with initial 90-day certificate validity.

### Wildcard and Multi-Domain Handling

**Wildcard Certificates:**

- Use `*.example.com` format in `common_name`
- EV certificates only allow wildcard domains if right-most label is "onion" (e.g., `*.example.onion`)

**Multi-Domain (SAN) Certificates:**

- Add additional domains to `dns_names` array
- Each SAN may incur additional cost
- OV/EV orders can mix wildcard and non-wildcard domains

### Domain Control Validation (DCV) Methods

| Method               | Description                  | Supports Wildcard |
| -------------------- | ---------------------------- | ----------------- |
| `email`              | Email to admin contact       | Yes               |
| `dns-txt-token`      | DNS TXT record (recommended) | Yes               |
| `dns-cname-token`    | DNS CNAME record             | Yes               |
| `http-token`         | HTTP file at specific path   | No (FQDN only)    |
| `http-token-dynamic` | Dynamic HTTP token           | No (FQDN only)    |

---

## Certificate Lifecycle Endpoints

### Reissue Certificate

**Endpoint:** `POST https://www.digicert.com/services/v2/order/certificate/{{order_id}}/reissue`

Replaces existing certificate with new one containing different information (CSR, common name, signature hash, etc.).

**Request Body:**

```json
{
  "certificate": {
    "csr": "-----BEGIN CERTIFICATE REQUEST-----\n...",
    "common_name": "example.com",
    "dns_names": ["www.example.com"],
    "signature_hash": "sha256",
    "server_platform": {
      "id": 45
    }
  },
  "skip_approval": false,
  "comments": "Reissuing due to key rotation"
}
```

**Key Parameters:**

| Parameter                        | Type    | Required | Description                                     |
| -------------------------------- | ------- | -------- | ----------------------------------------------- |
| `certificate.csr`                | string  | Yes      | New Certificate Signing Request                 |
| `certificate.common_name`        | string  | Yes\*    | Domain to secure (\*not for Code Signing)       |
| `certificate.signature_hash`     | string  | Yes      | Hash algorithm                                  |
| `certificate.server_platform.id` | integer | No       | Server platform                                 |
| `skip_approval`                  | boolean | No       | Skip approval step (requires admin)             |
| `cs_provisioning_method`         | string  | No       | For Code Signing: ship_token, email, client_app |
| `certificate_dcv_scope`          | string  | No       | base_domain or fqdn                             |
| `store_reissue_as_duplicate`     | boolean | No       | Store as duplicate for public TLS               |
| `comments`                       | string  | No       | Administrator notes                             |

**Response (201 Created):**

```json
{
  "id": 123456,
  "certificate_id": 987655,
  "requests": [
    {
      "id": 456790
    }
  ],
  "dcv_random_value": "abc123xyz"
}
```

### Update Auto-Reissue Settings

**Endpoint:** `PUT https://www.digicert.com/services/v2/order/certificate/{{order_id}}/auto-reissue`

When enabled for Multi-year Plans, DigiCert automatically creates reissue request when certificate is within 30 days of expiring.

### Revoke Single Certificate

**Endpoint:** `PUT https://www.digicert.com/services/v2/certificate/{{certificate_identifier}}/revoke`

The `certificate_identifier` can be:

- Certificate ID (numeric)
- Serial number

**Request Body:**

```json
{
  "revocation_reason": "keyCompromise",
  "comment": "Private key was compromised",
  "skip_approval": false
}
```

**Revocation Reasons (for TLS/SSL):**

| Reason                 | Description                               |
| ---------------------- | ----------------------------------------- |
| `unspecified`          | None of the other reasons apply (default) |
| `keyCompromise`        | Private key has been compromised          |
| `affiliationChanged`   | Organization information has changed      |
| `superseded`           | Certificate has been replaced             |
| `cessationOfOperation` | Domain no longer active or used           |

**Response:**

- `204 No Content` - When skip_approval is true
- `201 Created` - When creating revocation request (requires approval)

**Important Notes:**

- Revoking is permanent and irreversible
- Certificates with pending reissue cannot be revoked
- Administrator must approve unless `skip_approval: true` with admin API key
- After approval, DigiCert revokes the certificate

### Revoke All Order Certificates

**Endpoint:** `PUT https://www.digicert.com/services/v2/order/certificate/{{order_id}}/revoke`

Revokes all certificates on an order, including duplicates and reissues.

**Request Body:**

```json
{
  "revocation_reason": "keyCompromise",
  "skip_approval": false
}
```

### Download Certificate

**By Certificate ID:**

```
GET https://www.digicert.com/services/v2/certificate/{{certificate_id}}/download/platform
```

**By Certificate ID (specific format):**

```
GET https://www.digicert.com/services/v2/certificate/{{certificate_id}}/download/format/{{format_type}}
```

**By Order ID (active certificate only):**

```
GET https://www.digicert.com/services/v2/certificate/download/order/{{order_id}}
```

**By Order ID (specific format):**

```
GET https://www.digicert.com/services/v2/certificate/download/order/{{order_id}}/format/{{format_type}}
```

**Format Types:**

- `pem_all` - PEM with full chain
- `pem_noroot` - PEM without root
- `p7b` - PKCS#7
- `der` - DER format
- Platform-specific formats based on server_platform.id

**Response:**
Returns certificate file in requested format.

### Duplicate Certificate

**Endpoint:** `POST https://www.digicert.com/services/v2/order/certificate/{{order_id}}/duplicate`

Creates duplicate certificate with same information except CSR, validity, platform, and signature hash.

**Request Body:**

```json
{
  "certificate": {
    "common_name": "example.com",
    "dns_names": ["www.example.com"],
    "csr": "-----BEGIN CERTIFICATE REQUEST-----\n...",
    "server_platform": {
      "id": 45
    },
    "signature_hash": "sha256"
  }
}
```

**Rules:**

- All fields must be identical to original (except CSR, validity, platform, hash)
- Multi-domain: Can move SAN to common name
- Wildcard: Can add SANs if they're subdomains of wildcard
- Maximum validity: 397 days (industry standard)

**Response:**

```json
{
  "id": 123456,
  "certificate_id": 987656
}
```

### List Duplicates

**Endpoint:** `GET https://www.digicert.com/services/v2/order/certificate/{{order_id}}/duplicate`

Returns all certificate duplicates for an order.

### Get Order Info

**Endpoint:** `GET https://www.digicert.com/services/v2/order/certificate/{{order_id}}`

Can also use thumbprint or serial number of primary certificate (not duplicates).

**Response:**

```json
{
  "id": 123456,
  "status": "issued",
  "is_renewal": false,
  "date_created": "2024-01-15T10:30:00Z",
  "certificate": {
    "id": 987654,
    "common_name": "example.com",
    "dns_names": ["www.example.com", "api.example.com"],
    "valid_from": "2024-01-15T00:00:00Z",
    "valid_till": "2025-01-15T23:59:59Z",
    "days_remaining": 290,
    "signature_hash": "sha256",
    "key_size": 2048,
    "ca_cert": {
      "id": 1,
      "name": "DigiCert TLS RSA SHA256 2020 CA1"
    },
    "thumbprint": "abc123...",
    "serial_number": "0123456789ABCDEF"
  },
  "organization": {
    "id": 12345,
    "name": "Example Corp",
    "city": "San Francisco",
    "state": "California",
    "country": "US"
  },
  "product": {
    "name_id": "ssl_plus",
    "name": "Standard SSL",
    "type": "ssl_certificate",
    "validation_type": "OV"
  },
  "validity_years": 1,
  "price": 299.0,
  "payment_method": "balance",
  "container": {
    "id": 1,
    "name": "Default Division"
  },
  "user": {
    "id": 5678,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com"
  },
  "organization_contact": {
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "job_title": "IT Manager",
    "telephone": "+1-555-0100"
  },
  "technical_contact": {
    "first_name": "Bob",
    "last_name": "Johnson",
    "email": "bob.johnson@example.com"
  },
  "custom_fields": [],
  "requests": [],
  "allow_duplicates": true,
  "duplicates_count": 2,
  "has_duplicates": true,
  "reissues_count": 0,
  "has_reissues": false
}
```

### List Orders

**Endpoint:** `GET https://www.digicert.com/services/v2/order/certificate`

Supports filters, sorting, and pagination.

**Query Parameters:**

| Parameter                  | Description                    | Example                                     |
| -------------------------- | ------------------------------ | ------------------------------------------- |
| `container_id`             | Filter by container/division   | `12345`                                     |
| `organization_id`          | Filter by organization         | `67890`                                     |
| `user_id`                  | Filter by user                 | `111`                                       |
| `filters[date_created]`    | Creation date range/comparison | `=2024-01-01...2024-12-31` or `>2024-01-01` |
| `filters[valid_till]`      | Expiration date filter         | `<2024-12-31`                               |
| `filters[status]`          | Order status                   | `issued`, `pending`, `revoked`              |
| `filters[search]`          | Search domain/order ID         | `%example.com` or `123456`                  |
| `filters[common_name]`     | Filter by common name          | `%example.com`                              |
| `filters[product_name_id]` | Filter by product type         | `ssl_plus`                                  |
| `limit`                    | Max results (max 1000)         | `25`                                        |
| `offset`                   | Pagination offset              | `0`                                         |
| `sort`                     | Sort field (+/- for asc/desc)  | `-date_created`, `+common_name`             |

**Multiple Filter Values:**

```
filters[product_name_id][0]=ssl_plus&filters[product_name_id][1]=ssl_wildcard
```

**Sort Options:**

- `order_id`, `date_created`, `common_name`, `status`, `validity_years`, `product_name`, `valid_till`
- Prefix with `+` (ascending) or `-` (descending)

**Response:**

```json
{
  "orders": [
    {
      "id": 123456,
      "status": "issued",
      "is_renewed": false,
      "date_created": "2024-01-15T10:30:00Z",
      "certificate": {
        "id": 987654,
        "common_name": "example.com",
        "dns_names": ["www.example.com"],
        "valid_till": "2025-01-15T23:59:59Z",
        "days_remaining": 290,
        "signature_hash": "sha256"
      },
      "organization": {
        "id": 12345,
        "name": "Example Corp"
      },
      "product": {
        "name_id": "ssl_plus",
        "name": "Standard SSL",
        "type": "ssl_certificate"
      },
      "validity_years": 1,
      "container": {
        "id": 1,
        "name": "Default Division"
      },
      "duplicates_count": 2,
      "has_duplicates": true,
      "reissues_count": 0,
      "has_reissues": false
    }
  ],
  "page": {
    "total": 31,
    "limit": 25,
    "offset": 0
  }
}
```

**CSV Output:**
Change ACCEPT header to `text/csv` to get CSV format.

---

## Domain Management Endpoints

### Add Domain

**Endpoint:** `POST https://www.digicert.com/services/v2/domain`

Add domain, associate with organization, and submit for validation.

**Request Body:**

```json
{
  "name": "example.com",
  "organization": {
    "id": 12345
  },
  "validations": [
    {
      "type": "ov"
    },
    {
      "type": "ev"
    }
  ],
  "dcv_method": "dns-txt-token",
  "locale": "en",
  "email_array": ["admin@example.com"],
  "keep_www": false
}
```

**Parameters:**

| Parameter         | Type    | Required | Description                           |
| ----------------- | ------- | -------- | ------------------------------------- |
| `name`            | string  | Yes      | Domain name to add                    |
| `organization.id` | integer | Yes      | Organization identifier               |
| `validations`     | array   | Yes      | Validation types (ov, ev, cs, etc.)   |
| `dcv_method`      | string  | No       | DCV method (default: email)           |
| `locale`          | string  | No       | Language code for DCV emails          |
| `email_array`     | array   | No       | Specific verification email addresses |
| `keep_www`        | boolean | No       | Retain www subdomain (default: false) |

**Validation Types:**

- `ov` - Organization Validation
- `ev` - Extended Validation
- `cs` - Code Signing
- `ev_cs` - EV Code Signing
- `ds` - Document Signing
- `smime` - Secure Email

**Response (201 Created):**

```json
{
  "id": 111222,
  "validation_emails": {
    "name_scope": "example.com",
    "base_emails": [
      "admin@example.com",
      "administrator@example.com",
      "webmaster@example.com",
      "hostmaster@example.com",
      "postmaster@example.com"
    ]
  },
  "dcv_token": {
    "token": "abc123xyz789",
    "status": "pending",
    "expiration_date": "2024-12-31T23:59:59Z"
  }
}
```

**Important Notes:**

- By default, `www.` subdomain is removed unless using file-based DCV and `keep_www: true`
- At least one validation type required
- DCV method `http-token` and `http-token-dynamic` don't support wildcard domains

### Submit Domain for Validation

**Endpoint:** `POST https://www.digicert.com/services/v2/domain/{{domain_id}}/validation`

Submit domain for validation with specified validation types.

**Request Body:**

```json
{
  "validations": [
    {
      "type": "ov"
    }
  ],
  "dcv_method": "dns-txt-token"
}
```

### Get Domain Info

**Endpoint:** `GET https://www.digicert.com/services/v2/domain/{{domain_id}}`

**Query Parameters:**

- `include_dcv=true` - Include DCV token information
- `include_validation=true` - Include validation status

**Response:**

```json
{
  "id": 111222,
  "name": "example.com",
  "is_active": true,
  "date_created": "2024-01-10T09:00:00Z",
  "organization": {
    "id": 12345,
    "name": "Example Corp",
    "status": "active",
    "is_active": true
  },
  "validations": [
    {
      "type": "ov",
      "name": "Organization Validation",
      "status": "active",
      "date_created": "2024-01-10T09:00:00Z",
      "validated_until": "2025-01-10T23:59:59Z"
    }
  ],
  "dcv_method": "dns-txt-token",
  "dcv_token": {
    "token": "abc123xyz789",
    "status": "active",
    "expiration_date": "2024-12-31T23:59:59Z"
  },
  "dcv_expiration": {
    "ov": "2025-01-10T23:59:59Z"
  },
  "container": {
    "id": 1,
    "name": "Default Division"
  },
  "base_domain": "example.com"
}
```

### List Domains

**Endpoint:** `GET https://www.digicert.com/services/v2/domain`

**Query Parameters:**

| Parameter             | Description                     |
| --------------------- | ------------------------------- |
| `filters[validation]` | Filter by validation type       |
| `container_id`        | Filter by container             |
| `limit`               | Max results (default/max: 1000) |
| `offset`              | Pagination offset               |
| `sort`                | Sort field                      |

**Response:**

```json
{
  "domains": [
    {
      "id": 111222,
      "name": "example.com",
      "is_active": true,
      "date_created": "2024-01-10T09:00:00Z",
      "organization": {
        "id": 12345,
        "name": "Example Corp"
      },
      "validations": [
        {
          "type": "ov",
          "status": "active",
          "validated_until": "2025-01-10T23:59:59Z"
        }
      ],
      "dcv_method": "dns-txt-token",
      "container": {
        "id": 1,
        "name": "Default Division"
      }
    }
  ],
  "page": {
    "total": 15,
    "limit": 1000,
    "offset": 0
  }
}
```

### Get Validation Details

**Endpoint:** `GET https://www.digicert.com/services/v2/domain/{{domain_id}}/validation`

Returns detailed validation information including type, status, dcv_status, org_status, and expiration.

### List Validation Types

**Endpoint:** `GET https://www.digicert.com/services/v2/domain/validation-type`

Returns available validation types for domains.

### List DCV Methods

**Endpoint:** `GET https://www.digicert.com/services/v2/domain/dcv/method`

Returns DCV methods available to domains.

### Generate DCV Token

**Endpoint:** `POST https://www.digicert.com/services/v2/domain/{{domain_id}}/dcv/token`

Generate new domain control validation random value for domain.

### Check Domain DCV (Domain-Level)

**Endpoint:** `PUT https://www.digicert.com/services/v2/domain/{{domain_id}}/dcv/validate-token`

Check DCV for pending domain submitted for pre-validation or as part of OV/EV order.

**Response (200 OK):**

```json
{
  "token": "abc123xyz789",
  "status": "active"
}
```

**Note:** Using this endpoint does not reset or restart automatic DCV polling interval.

### Check Order DCV (Order-Level)

**Endpoint:** `PUT https://www.digicert.com/services/v2/order/certificate/{{order_id}}/check-dcv`

Check DCV for pending TLS/SSL certificate order with dns-txt-token, dns-cname-token, or http-token method.

**Request Body (optional):**

```json
{
  "dns_names_validations": ["sub1.example.com", "sub2.example.com"]
}
```

**Response (200 OK):**

```json
{
  "order_status": "issued",
  "certificate_id": 249076999,
  "dcv_status": "valid",
  "dns_name_validations": [
    {
      "dns_name": "sub1.example.com",
      "status": "approved"
    },
    {
      "dns_name": "sub2.example.com",
      "status": "approved"
    }
  ]
}
```

**Note:** Returns 400 error if random value not found for http-token method.

### Resend DCV Email

**Endpoint:** `POST https://www.digicert.com/services/v2/domain/{{domain_id}}/validation/email`

Resend DCV email for email-based validation.

---

## Organization Management Endpoints

### Create Organization

**Endpoint:** `POST https://www.digicert.com/services/v2/organization`

**Request Body:**

```json
{
  "name": "Example Corporation",
  "assumed_name": "Example Corp",
  "country": "US",
  "address": "123 Main Street",
  "address2": "Suite 100",
  "city": "San Francisco",
  "state": "California",
  "zip": "94105",
  "telephone": "+1-555-0100",
  "organization_contact": {
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "job_title": "IT Manager",
    "telephone": "+1-555-0101",
    "telephone_extension": "123"
  },
  "skip_duplicate_org_check": false,
  "validations": [
    {
      "type": "ov",
      "verified_users": [
        {
          "first_name": "John",
          "last_name": "Doe",
          "email": "john.doe@example.com"
        }
      ]
    }
  ]
}
```

**Core Organization Fields:**

| Parameter      | Type   | Required | Max Length    | Description                |
| -------------- | ------ | -------- | ------------- | -------------------------- |
| `name`         | string | Yes      | 64\*          | Legal organization name    |
| `assumed_name` | string | No       | Combined 61\* | DBA/public name            |
| `country`      | string | Yes      | 2             | ISO 3166-1 alpha-2 code    |
| `address`      | string | Yes      | 64            | Street address             |
| `address2`     | string | No       | 64            | Secondary address line     |
| `city`         | string | Yes      | 64            | City                       |
| `state`        | string | Yes      | 64            | State/province (full name) |
| `zip`          | string | Yes      | 40            | Postal code                |
| `telephone`    | string | Yes      | 32            | Phone number               |

\*If `assumed_name` provided, combined length of `name` + `assumed_name` cannot exceed 61 characters.

**Organization Contact Fields:**

| Parameter             | Type   | Required | Max Length |
| --------------------- | ------ | -------- | ---------- |
| `first_name`          | string | Yes      | 128        |
| `last_name`           | string | Yes      | 128        |
| `email`               | string | Yes      | 255        |
| `job_title`           | string | No       | 64         |
| `telephone`           | string | No       | 32         |
| `telephone_extension` | string | No       | 16         |

**Optional Parameters:**

| Parameter                  | Type    | Description                                          |
| -------------------------- | ------- | ---------------------------------------------------- |
| `skip_duplicate_org_check` | boolean | Bypass duplicate checking                            |
| `validations`              | array   | Pre-validation objects with types and verified_users |

**Validation Types:**

- `ov`, `ev`, `cs`, `ev_cs`, `ds`, `smime`

**Response (201 Created):**

```json
{
  "id": 112236
}
```

### Get Organization Info

**Endpoint:** `GET https://www.digicert.com/services/v2/organization/{{organization_id}}`

Returns detailed organization information including validation status.

### Submit Organization for Validation

**Endpoint:** `POST https://www.digicert.com/services/v2/organization/{{organization_id}}/validation`

Submit organization for validation and add verified contacts.

**Request Body:**

```json
{
  "validations": [
    {
      "type": "ov",
      "verified_users": [
        {
          "first_name": "John",
          "last_name": "Doe",
          "email": "john.doe@example.com"
        }
      ]
    }
  ]
}
```

### List Organizations

**Endpoint:** `GET https://www.digicert.com/services/v2/organization`

List all organizations in account with filtering and pagination support.

### Activate Organization

**Endpoint:** `PUT https://www.digicert.com/services/v2/organization/{{organization_id}}/activate`

Activate an inactive organization.

### Deactivate Organization

**Endpoint:** `PUT https://www.digicert.com/services/v2/organization/{{organization_id}}/deactivate`

Deactivate an active organization.

### Get Organization Validation Details

**Endpoint:** `GET https://www.digicert.com/services/v2/organization/{{organization_id}}/validation`

Returns validation status details for the organization.

**Note:** Organization `status` property (active/inactive) is separate from validation status.

---

## User/Account Management Endpoints

### List Users

**Endpoint:** `GET https://www.digicert.com/services/v2/user`

**Query Parameters:**

- `container_id` - Filter by container/division
- `limit` - Max results
- `offset` - Pagination offset

**CSV Output:** Change ACCEPT header to `text/csv`

**Response:**

```json
{
  "users": [
    {
      "id": 5678,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "job_title": "System Administrator",
      "phone_number": "+1-555-0100",
      "status": "active",
      "access_roles": [
        {
          "id": 1,
          "name": "Administrator"
        }
      ],
      "container": {
        "id": 1,
        "name": "Default Division"
      }
    }
  ],
  "page": {
    "total": 25,
    "limit": 100,
    "offset": 0
  }
}
```

### Add Service User

**Endpoint:** `POST https://www.digicert.com/services/v2/user`

Create service user with API key. Service users have API-only access.

**Request Body:**

```json
{
  "username": "api-integration",
  "first_name": "API",
  "last_name": "Service User",
  "email": "api@example.com",
  "access_roles": [
    {
      "id": 1
    }
  ],
  "container": {
    "id": 1
  },
  "api_key_description": "Integration API Key"
}
```

**Response (201 Created):**

```json
{
  "id": 9999,
  "api_key": "abc123xyz789def456ghi012jkl345mno678pqr901stu234vwx567"
}
```

**Important:** API key shown only once - cannot be retrieved later.

### Edit User

**Endpoint:** `PUT https://www.digicert.com/services/v2/user/{{user_id}}`

Update user profile information.

**Request Body:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "job_title": "Senior System Administrator",
  "phone_number": "+1-555-0100"
}
```

**Note:** Fields not included (`job_title`, `phone_number`) will be removed from profile.

To change user role, use Change user role endpoint (separate).

### Delete User

**Endpoint:** `DELETE https://www.digicert.com/services/v2/user/{{user_id}}`

**Response:** `204 No Content`

### Additional User Endpoints

Based on API documentation, additional endpoints exist for:

- Edit service user
- Change user role
- Update container assignments

### Get Account Details

**Endpoint:** `GET https://www.digicert.com/services/v2/account`

Returns account information and settings.

---

## Webhook Management Endpoints

### Overview

CertCentral webhooks send automatic updates for certificate issuance and validation events.

**Important Notes:**

- Webhooks not enabled for all accounts - contact account manager to request access
- Only one webhook per CertCentral account
- Endpoint must use HTTPS protocol
- Verification challenge required after creation
- Secret key recommended for security

### Create Webhook

**Endpoint:** `POST https://www.digicert.com/services/v2/webhook`

**Request Body:**

```json
{
  "endpoint": "https://example.com/webhooks/digicert",
  "secret": "your-secret-key-minimum-32-characters-long-abc123",
  "events": [
    "certificate_issued",
    "certificate_revoked",
    "domain_validated",
    "organization_validated",
    "order_rejected"
  ],
  "webhook_settings": {
    "instant_issue_webhook_notification": 1,
    "webhook_notification_frequency": [90, 60, 30, 7, 0, -7],
    "webhook_send_certificate_chain": 1,
    "webhook_send_instant_issued_certificate_chain": 1
  }
}
```

**Parameters:**

| Parameter          | Type   | Required | Description                                       |
| ------------------ | ------ | -------- | ------------------------------------------------- |
| `endpoint`         | string | Yes      | HTTPS URL hosting webhook listener                |
| `secret`           | string | No       | Min 32 chars; sent in X-WEBHOOK-KEY header        |
| `events`           | array  | No       | Event subscriptions (default: certificate_issued) |
| `webhook_settings` | object | No       | Notification customization                        |

**Webhook Settings:**

| Setting                                         | Type  | Description                                              |
| ----------------------------------------------- | ----- | -------------------------------------------------------- |
| `instant_issue_webhook_notification`            | int   | Send for instantly-issued certs (0 or 1)                 |
| `webhook_notification_frequency`                | array | Timing for expiration alerts (90, 60, 30, 7, 0, -7 days) |
| `webhook_send_certificate_chain`                | int   | Include chain for non-instant certs (0 or 1)             |
| `webhook_send_instant_issued_certificate_chain` | int   | Include chain for instant certs (0 or 1)                 |

**Supported Event Types:**

| Event                              | Description                           |
| ---------------------------------- | ------------------------------------- |
| `certificate_issued`               | Certificate issued in account         |
| `certificate_revoked`              | Certificate revoked                   |
| `order_rejected`                   | Order rejected                        |
| `organization_validated`           | Organization validation completed     |
| `organization_expired`             | Organization validation expired       |
| `organization_revalidation_notice` | Organization validation expiring soon |
| `domain_validated`                 | Domain control validation completed   |
| `domain_expired`                   | Domain validation expired             |
| `domain_revalidation_notice`       | Domain validation expiring soon       |

**Response (201 Created):**

```json
{
  "webhook_id": 1234
}
```

**Next Steps After Creation:**

1. Send test event to verify communication
2. Complete verification challenge
3. Activate webhook

### List Webhooks

**Endpoint:** `GET https://www.digicert.com/services/v2/webhook`

Returns webhook information. Since only one webhook allowed per account, returns single webhook object in array.

**Response:**

```json
{
  "webhooks": [
    {
      "id": 1234,
      "endpoint": "https://example.com/webhooks/digicert",
      "status": "active",
      "events": ["certificate_issued", "domain_validated"],
      "webhook_settings": {
        "instant_issue_webhook_notification": 1,
        "webhook_notification_frequency": [90, 60, 30, 7, 0, -7]
      }
    }
  ]
}
```

### Update Webhook

**Endpoint:** `PUT https://www.digicert.com/services/v2/webhook/{{webhook_id}}`

**Request Body:**

```json
{
  "endpoint": "https://example.com/webhooks/digicert-new",
  "secret": "new-secret-key-minimum-32-characters-long-xyz789",
  "events": ["certificate_issued", "certificate_revoked"],
  "webhook_settings": {
    "instant_issue_webhook_notification": 0
  }
}
```

**Note:** When changing endpoint, must complete verification challenge and reactivate webhook.

### Activate Webhook

**Endpoint:** `PUT https://www.digicert.com/services/v2/webhook/{{webhook_id}}/activate`

Activate webhook after verification.

**Response:** `204 No Content`

### Send Test Event

**Endpoint:** `POST https://www.digicert.com/services/v2/webhook/test-endpoint`

Send test event to webhook endpoint to verify communication.

**Request Body:**

```json
{
  "endpoint": "https://example.com/webhooks/digicert"
}
```

**Expected Response from Your Endpoint:** `200 OK`

### Get Webhook Event Logs

**Endpoint:** `GET https://www.digicert.com/services/v2/webhook/event-logs`

Returns log of events sent to webhook listener.

**Query Parameters:**

- `limit` - Max results
- `offset` - Pagination offset

**Response:**

```json
{
  "events": [
    {
      "id": 555666,
      "event_type": "certificate_issued",
      "timestamp": "2024-01-15T14:30:00Z",
      "order_id": 123456,
      "certificate_id": 987654,
      "http_status": 200,
      "attempts": 1
    }
  ],
  "page": {
    "total": 150,
    "limit": 25,
    "offset": 0
  }
}
```

### Webhook Security

**Secret Key:**

- Minimum 32 characters
- Included in `X-WEBHOOK-KEY` header of webhook events
- Verify this value in your webhook listener to ensure authenticity
- Prevents processing of invalid/spoofed events

**Example Event Headers:**

```
POST /webhooks/digicert HTTP/1.1
Host: example.com
Content-Type: application/json
X-WEBHOOK-KEY: your-secret-key-minimum-32-characters-long-abc123
User-Agent: DigiCert-Webhook/1.0
```

---

## Common Response Formats and Pagination

### Pagination Pattern

List endpoints support standard pagination via URL query parameters:

**Query Parameters:**

| Parameter | Description           | Example                 |
| --------- | --------------------- | ----------------------- |
| `limit`   | Max results to return | `25` (max usually 1000) |
| `offset`  | Starting index        | `0`                     |

**Example:**

```
GET https://www.digicert.com/services/v2/order/certificate?limit=25&offset=50
```

**Response Page Object:**

```json
{
  "page": {
    "total": 150,
    "limit": 25,
    "offset": 50
  }
}
```

### Filtering

**Basic Filters:**

```
filters[{{property_name}}]={{value}}
```

**Search Filters (with wildcards):**

```
filters[search]=%25example.com
```

- `%25` represents `%` (URL-encoded wildcard for partial matching)

**Date Range Filters:**

```
filters[date_created]=2024-01-01T00:00:00...2024-12-31T23:59:59
```

**Date Comparison Filters:**

```
filters[valid_till]=>2024-06-01    # After date
filters[valid_till]=<2024-12-31    # Before date
```

**Multiple Values:**

```
filters[status][0]=issued&filters[status][1]=pending
```

### Sorting

**Syntax:**

```
sort={{field}}    # Ascending (default)
sort=-{{field}}   # Descending
```

**Multiple Fields:**

```
sort=status,-date_created
```

### Combined Example

```
GET https://www.digicert.com/services/v2/order/certificate?
  container_id=12345&
  filters[status]=issued&
  filters[product_name_id][0]=ssl_plus&
  filters[product_name_id][1]=ssl_wildcard&
  filters[date_created]=2024-01-01...2024-12-31&
  sort=-date_created&
  limit=50&
  offset=0
```

### HTTP Status Codes

| Code | Meaning               | Description                                       |
| ---- | --------------------- | ------------------------------------------------- |
| 200  | OK                    | Successful GET request                            |
| 201  | Created               | Resource successfully created                     |
| 204  | No Content            | Successful DELETE or action with no response body |
| 400  | Bad Request           | Invalid request parameters                        |
| 401  | Unauthorized          | Invalid or missing API key                        |
| 403  | Forbidden             | API key lacks required permissions                |
| 404  | Not Found             | Resource not found                                |
| 429  | Too Many Requests     | Rate limit exceeded                               |
| 500  | Internal Server Error | Server-side error                                 |

### Error Response Format

```json
{
  "errors": [
    {
      "code": "invalid_parameter",
      "message": "The common_name parameter is required"
    }
  ]
}
```

### Content Type Handling

**JSON (default):**

```
Content-Type: application/json
Accept: application/json
```

**XML:**

```
Content-Type: application/xml
Accept: application/xml
```

**CSV (list endpoints):**

```
Accept: text/csv
```

### Rate Limiting

DigiCert implements rate limiting, though specific limits not publicly documented. Best practices:

- Implement exponential backoff for 429 responses
- Cache frequently-accessed data
- Use webhooks instead of polling where possible
- Batch operations when API supports it

---

## Product Types

### List Products

**Endpoint:** `GET https://www.digicert.com/services/v2/product`

Returns products available to your account.

**Response:**

```json
{
  "products": [
    {
      "group_name": "SSL/TLS Certificates",
      "name_id": "ssl_plus",
      "name": "Standard SSL",
      "type": "ssl_certificate",
      "validation_type": "OV",
      "allowed_container_ids": [1, 2, 3],
      "allowed_validity_years": [1],
      "allowed_order_validity_years": [1, 2, 3],
      "signature_hash_types": {
        "allowed": ["sha256", "sha384", "sha512"],
        "default": "sha256"
      },
      "csr_required": true
    }
  ]
}
```

**Product Fields:**

| Field                          | Description                               |
| ------------------------------ | ----------------------------------------- |
| `group_name`                   | Product category                          |
| `name_id`                      | Unique identifier for API calls           |
| `name`                         | Human-readable product name               |
| `type`                         | Certificate type                          |
| `validation_type`              | OV, EV, DV, etc.                          |
| `allowed_container_ids`        | Containers where product available        |
| `allowed_validity_years`       | Certificate validity options              |
| `allowed_order_validity_years` | Order validity options (Multi-year Plans) |
| `signature_hash_types`         | Allowed and default hash algorithms       |
| `csr_required`                 | Whether CSR required                      |

### Common Product Name IDs

**SSL/TLS Certificates:**

- `ssl_plus` - Standard SSL (OV)
- `ssl_multi_domain` - Multi-Domain SSL (OV)
- `ssl_wildcard` - Wildcard SSL (OV)
- `ssl_ev_plus` - EV SSL
- `ssl_ev_multi_domain` - EV Multi-Domain SSL
- `ssl_cloud_wildcard` - Cloud Certificate
- `ssl_basic` - Basic OV (Flex)
- `ssl_securesite_flex` - Secure Site OV (Flex)

**Code Signing:**

- `code_signing` - Code Signing Certificate
- `code_signing_ev` - EV Code Signing Certificate

**Client Certificates (S/MIME):**

- Individual, Business, and Organization variants

**Document Signing:**

- Various document signing certificate types

### Get Product Info

**Endpoint:** `GET https://www.digicert.com/services/v2/product/{{name_id}}`

Get detailed information about specific product.

### Get Pricing List

**Endpoint:** `GET https://www.digicert.com/services/v2/product/pricing`

Returns comprehensive pricing information including SAN costs.

**Response:**

```json
{
  "products": [
    {
      "name_id": "ssl_plus",
      "name": "Standard SSL",
      "validity_years": 1,
      "price": 299.0,
      "additional_san_price": 99.0,
      "currency": "USD"
    }
  ]
}
```

### Certificate Format Map

**Endpoint:** `GET https://www.digicert.com/services/v2/product/platform-certformat-mapping`

List certificate format returned for each server platform.

---

## Additional Resources

### Official Documentation

- [DigiCert Developer Portal](https://dev.digicert.com/)
- [Services API Overview](https://dev.digicert.com/certcentral-apis/services-api.html)
- [Authentication Guide](https://dev.digicert.com/certcentral-apis/authentication.html)

### API Endpoints Base

- Production (US): https://www.digicert.com/services/v2/
- Production (EU): https://certcentral.digicert.eu/services/v2/
- Beta: https://beta.digicert.com/services/v2/

### Support

- Contact DigiCert Support for webhook access
- Account Manager for product activation
- CertCentral Console: Automation > API Keys for key management

---

## Summary

The DigiCert CertCentral Services API v2 provides comprehensive RESTful endpoints for:

1. **Certificate Ordering** - Order various certificate types (OV, EV, wildcard, multi-domain) with flexible validation options
2. **Certificate Lifecycle** - Reissue, revoke, download, and duplicate certificates
3. **Domain Management** - Add domains, submit for validation, check DCV status, manage validation methods
4. **Organization Management** - Create organizations, submit for validation, manage organization details
5. **User Management** - Create service users, manage user accounts and permissions
6. **Webhook Management** - Configure automated event notifications for certificate and validation events
7. **Comprehensive Filtering** - List operations with advanced filtering, sorting, and pagination
8. **Product Management** - View available products and pricing

All endpoints use header-based API key authentication via `X-DC-DEVKEY` header and return JSON responses with consistent pagination and error handling patterns.

Maximum certificate validity is currently 199 days (industry standard). Multi-year Plans allow orders up to 3 years with automatic reissuance.

DCV methods include email, DNS TXT/CNAME, and HTTP file-based validation. Pre-validating domains and organizations accelerates certificate issuance.
