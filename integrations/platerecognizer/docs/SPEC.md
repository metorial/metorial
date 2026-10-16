# Plate Recognizer Integration

This integration processes still images with Plate Recognizer cloud services. It supports license plates and vehicle attributes, image blurring, VINs, trailer IDs, boat registration numbers, USDOT numbers, shipping container markings, and the current OCR service, including odometer readings.

## Authentication

Connect an API token from the Plate Recognizer dashboard. Requests use `Authorization: Token <token>`. Product access and usage quotas depend on the connected account's subscriptions. There is no OAuth flow or connection-wide resource configuration.

## Tools and products

| Tool | Product and behavior |
| --- | --- |
| `recognize_plate` | Snapshot: recognize plates and optional vehicle make/model, color, orientation, year, and direction. Supports regions and engine configuration. |
| `blur_image_file` | Blur: return detection metadata and a downloadable blurred image when produced. |
| `blur_image` | Deprecated compatibility tool retaining the original structured image-data response. Prefer `blur_image_file`. |
| `recognize_text` | Current OCR: select `vin`, `trailer_id`, `odometer`, `shipping_container`, or `boat_reg_number`. |
| `recognize_vin` | Deprecated VIN ID compatibility tool. Continues to use the original request and response contract. Prefer `recognize_text` with `type="vin"`. |
| `recognize_trailer` | Original TrailerID reader. Kept for compatibility; use `recognize_text` for the current OCR workflow. |
| `recognize_boat` | Original BoatID reader. Kept for compatibility; use `recognize_text` for the current OCR workflow. |
| `recognize_usdot` | USDOT OCR: decode commercial vehicle markings; return all detections and confidence scores. |
| `recognize_container` | Shipping Container Images: return container markings and recognition metadata. |
| `get_usage` | Read billing-period usage for Snapshot, OCR, VIN, or TrailerID. |
| `list_licenses` | List licenses owned by the connected account for a provider product type, with optional expiration filters and page controls. |

Tools are grouped by implemented provider product. Usage and license discovery span products. This integration does not currently expose Stream camera/video processing or webhook triggers.

## Image inputs and compatibility

Image readers accept `imageUrl` and `imageBase64`. Existing request precedence is preserved: a nonempty URL takes priority over base64; optional empty image strings, camera IDs, and timestamps are omitted as before.

Snapshot, OCR, and the original VIN, TrailerID, and BoatID readers forward URLs to the provider as `upload_url`; no image URLs are downloaded by this integration. The current OCR service typically takes 20–30 seconds per image.

USDOT OCR and Shipping Container Images document a multipart binary `image` upload. Use `imageBase64` to supply those bytes. Their preexisting `imageUrl` input remains forwarded as `upload_url`, with its original priority, but these products do not document that parameter. URL-only recognition for shipping containers is documented by `recognize_text` with `type="shipping_container"`.

Original numeric inputs, constraints, and omission behavior remain intact. New optional confidence filters do not send provider defaults when omitted. New page controls and plate/zoom counts must be positive integers at runtime.

## Recognition output

Snapshot `results` retains the original plate-result shape. In vehicle mode, nested plate predictions are projected into this shape. Vehicles without a plate are retained in `vehicleResults`, which contains every original detection; `raw` retains the complete response and its ordering. Vehicle-only results do not receive fabricated plate strings, confidence values, or boxes.

USDOT exposes the first detected object's box through the original `detectedObject` field and flattens text readings from every detection into the original `texts` array. The additive `results` and `raw` fields preserve all individual objects, boxes, and image metadata. Empty detection lists are valid.

The new OCR tool exposes identifier text, orientation, confidence, and container field labels when provided, plus the original detections and complete response. Orientation is not available for all recognition types. No identifier, confidence, timestamp, or expiry is synthesized.

## Blurred images

Use `blur_image_file` for processed images. It calls the provider once and returns plate polygon coordinates, original plate detection context, and face boxes. Embedded file payloads are removed from every new structured metadata field, including nested raw metadata.

If the provider returns image bytes, the tool validates the encoded data, requires nonempty decoded bytes, identifies the image MIME type from a JPEG, PNG, GIF, WebP, BMP, TIFF, or AVIF signature, and checks any provider MIME type against that format before preparing the downloadable image. The output includes the real filename and provider MIME type only when supplied, the decoded byte count, and a separately labeled `verifiedMimeType` derived from the file signature. A null provider MIME type stays absent from `mimeType`; a verified format is used for the download. Format validation checks signatures and does not perform a full image decode.

The documented response may contain `blur: null` when blurring is disabled. This is a successful detection-only result: `fileProduced` is false, file metadata is absent, all detection context remains, and the message does not claim that an image was prepared.

The old `blur_image` tool is deprecated because its required structured base64 response cannot express this file-only workflow. Its original input/output schemas, handler, request, required string fields, and legacy fallback values remain exactly frozen for existing callers. The new tool does not return embedded image bytes in structured output. This integration-level deprecation does not claim that the provider Blur API is deprecated.

## Account context and pagination

`list_licenses` is account-scoped discovery, not a user identity claim. Supply the provider product type used by your account. It returns complete license records and the provider's `count`, `next`, and `previous` metadata. Request pages with `page` and `pageSize`; returned URLs are never fetched with credentials.

The documented cloud APIs do not expose a general current-user/profile endpoint, so this integration does not invent a `who_am_i` result from a token or usage record.

## Official references

- [Generated cloud API reference](https://api.platerecognizer.com/v1/api-reference/): Snapshot, OCR recognition and statistics, positive VIN ID deprecation, and account licenses.
- [Snapshot API](https://guides.platerecognizer.com/docs/snapshot/api-reference/): cloud versus on-premise boundaries.
- [OCR API](https://guides.platerecognizer.com/docs/other-apps/ocr/api-reference/): recognition types, processing time, and response structure.
- [Blur API](https://guides.platerecognizer.com/docs/other-apps/blur/api-reference/): authenticated POST, detection-only mode, nullable blur results, plate polygons, and returned image bytes.
- [USDOT Cloud API](https://guides.platerecognizer.com/docs/other-apps/usdot/cloud/), [parameters](https://guides.platerecognizer.com/docs/other-apps/usdot/parameters/), and [response](https://guides.platerecognizer.com/docs/other-apps/usdot/webhooks/): correct host, binary image upload, optional filters, and multiple/empty detections.
- [Shipping Container Images](https://guides.platerecognizer.com/docs/other-apps/shipping-container-images/getting-started/) and [parameters](https://guides.platerecognizer.com/docs/other-apps/shipping-container-images/parameters/): separate product and binary image contract.
- [TrailerID](https://platerecognizer.com/trailerid/): original reader endpoint and nested identifier response.
