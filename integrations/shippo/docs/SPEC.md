# Shippo integration

## Authentication

API tokens use `Authorization: ShippoToken`; partner OAuth uses `Authorization: Bearer`. The API server is `https://api.goshippo.com` with explicit version `2018-02-08`. OAuth requests Shippo’s sole `*` scope, exchanges an authorization code as form data at `https://goshippo.com/oauth/access_token`, and has no refresh operation because the documented token does not expire. Registered redirect URLs must match Shippo’s partner configuration.

`get_current_context` validates read-only carrier access. It returns the authentication mode and known API test/live token state. It does not invent a user or account identity. OAuth rate test state must be read from the individual provider response.

## Shipping workflows

The 25 tools cover address creation/validation/listing; shipment creation, retrieval and rate comparison; rate-selected or single-call label purchase; transaction retrieval/listing; package tracking and registration for previously configured tracking webhooks; customs declarations; order creation/listing; carrier discovery; manifest closeout; pickup scheduling; refund requests; parcel templates; and batch creation/purchase. `get_shipping_resource` retrieves existing orders, refunds, manifests and batches by exact ID.

Lists return one provider page and exact continuation links. `totalCount` is omitted when Shippo does not report it. Rate ordering does not guarantee the cheapest option. Currency amounts remain exact decimal strings.

A batch copies supported details from supplied shipment IDs into new inline batch shipments. Batch validation and purchase are asynchronous; inspect status and per-shipment results before retrying. Creating a manifest without transaction IDs closes all applicable labels for that carrier and date. A legacy `YYYY-MM-DD` manifest date is submitted as midnight UTC.

Parcel templates support custom name/dimensions or a carrier template token. Carrier mode omits custom name/dimensions; weight and mass unit must be supplied together. Customs declarations require an explicit non-delivery choice, an explanation for OTHER contents, and AES/ITN reference when applicable. Current incoterms are DDP, DDU, FCA, DAP and eDAP; unsupported legacy values fail locally with guidance.

## Documents and lifecycle

Successful label transactions, manifest closeouts and purchased batches provide available downloadable files. `download_document` prepares an existing label, commercial invoice, manifest or indexed merged batch-label document. Delivery is limited to supported provider hosts, PDF/PNG/requested ZPL and 32 MiB. Queued/error states have no ready document. Link renewal is not guaranteed; a failed or expired download does not justify repeating a purchase. Commercial invoices require an eligible international shipment.

API test tokens produce non-mailable test labels and do not support batches or manifests. Test refunds do not prove a monetary reimbursement. Live label purchase can charge the connected account. Pickups require a complete inline address, phone, building location and valid time window; editing/cancelling requires contacting the carrier, and confirmation may cause carrier communications.

Shippo generally retains immutable shipping objects. User parcel templates have a documented delete endpoint; this integration exposes creation/listing, while controlled verification can delete its own template. No carrier-account administration, managed-account onboarding, checkout service-group management or event listener is exposed.

## Provider references

- [Current public API specification](https://docs.goshippo.com/spec/shippoapi/public-api.yaml)
- [Authentication](https://docs.goshippo.com/guides/authentication) and [partner OAuth](https://docs.goshippo.com/o-auth-integrations/o-auth)
- [API versions](https://docs.goshippo.com/api-concepts/api-versioning), [filtering](https://docs.goshippo.com/api-concepts/filtering), and [test mode](https://docs.goshippo.com/guides/testing)
- [Batch labels](https://docs.goshippo.com/shipments/batch-label-creation) and [pickups](https://docs.goshippo.com/manifests-and-pickups/pickups)
