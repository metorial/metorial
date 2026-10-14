# CallerAPI capability reference

CallerAPI provides phone intelligence, spam reputation, carrier information, portability checks, online presence, and carrier identity matching.

## Authentication

Use an API key from the CallerAPI dashboard in the `X-Auth` request header. Current documented endpoints use `https://api.callerapi.com`. Account identity and credit balances come from `GET /api/me`.

## Tools and provider operations

| Tool key | Provider operation | Result |
| --- | --- | --- |
| `get_account_info` | `GET /api/me` | Email and account credit balances. |
| `lookup_phone_number` | `GET /api/lookup/{phone}` with the optional `hlr` query parameter | Carrier details, spam scores, complaints, and the original provider response. |
| `check_ported_status` | `GET /api/ported/{phone}` | Ported flag, date, date precision, and status. |
| `get_porting_history` | `GET /api/porting-history/{phone}` | Porting action, network identifier, line type, and timestamp. |
| `check_online_presence` | `GET /api/online-presence/{phone}` | Platform presence statuses, including Facebook, Bukalapak, and Flipkart. |
| `verify_identity` | `POST /api/kyc/{phone}` | Identity match scores and the original provider response. |
| `get_caller_id` | Existing `GET https://callerapi.com/api/phone/info/{phone}` | Caller identification from the existing provider sources. |
| `get_caller_picture` | Existing `GET https://callerapi.com/api/phone/pic/{phone}` | Original `pictureBase64` plus a downloadable file when the response contains a base64 image. |
| `assess_port_fraud_risk` | Existing `GET https://callerapi.com/api/port-fraud/{phone}` | Port fraud risk and the original provider response. |

Phone number inputs retain E.164 strings, including the leading plus sign. KYC requires a name with first and last names; middle name, date of birth, address, and email are optional. Date of birth components are strings. KYC scores are strings: -1 indicates unavailable carrier data, 0 indicates no match, and 100 indicates an exact match. The provider charges credits for KYC and some other intelligence operations.

Porting events map the documented `action`, `tmtnetwork`, `i_type`, and `ts` fields into the existing public fields. The numeric network identifier is represented as text in the existing `networkId` field. Existing numeric status fields are retained; `responseStatus` exposes string statuses where the current schema uses them.

Presence values are 1 for active, 0 for inactive, -1 for unknown, and -2 for a platform error. The older reference documents numeric status 4 as a partial reply; partial replies remain usable and do not turn uncertain platform checks into absence claims.

## Compatibility and verification limits

The current reference does not list the existing caller ID, caller picture, or port-fraud endpoints. Their original hosts and paths are retained. This omission does not establish that the endpoints were removed; their availability and response details require verification with an authorized account. The integration registers no triggers. Other provider products, including voice streaming and report webhooks, are outside this tool refresh.

## Official documentation

- [Quickstart and API host](https://docs.callerapi.com/)
- [Account balances](https://docs.callerapi.com/balance-and-email-20033243e0)
- [Spam score and HLR](https://docs.callerapi.com/spam-score-hlr-19887237e0)
- [Carrier response schema](https://docs.callerapi.com/carrier-info-8537080d0)
- [Ported status](https://docs.callerapi.com/ported-date-20034060e0)
- [Porting history](https://docs.callerapi.com/porting-history-20035134e0)
- [Online presence](https://docs.callerapi.com/online-presence-20039197e0)
- [KYC identity matching](https://docs.callerapi.com/kyc-user-identity-19887238e0)
