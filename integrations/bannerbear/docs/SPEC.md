# Bannerbear integration specification

This integration exposes 18 tools against the documented [V2 API](https://developers.bannerbear.com/v2/). [V5](https://developers.bannerbear.com/v5/) uses incompatible keys and resource contracts; this package preserves V2 compatibility rather than silently migrating existing connections.

| Workflow | Tools |
| --- | --- |
| Generate media | generate_image, generate_video, generate_collection, generate_animated_gif, compose_movie, capture_screenshot |
| Templates | manage_template, list_templates, get_template |
| Browser editor and signed bases | create_editor_session, create_signed_url |
| PDF operations and diagnoses | join_pdfs, rasterize_pdf, diagnose_image |
| Identity, discovery and files | get_account, get_resource, list_resources, download_file |

Use a V2 Project or Full Access Master API key. Project keys select their project automatically. Full Access Master keys use project discovery and optional per-tool projectId. Account identity is the native account UID, not an inferred human identity. Limited Access Master keys only support project operations and cannot provide the required account profile for a new connection. There is no OAuth or required project ID in connection configuration.

Readback binds the exact requested UID. Listings return a single numbered page; continue until an empty page without assuming a stable snapshot or total count. Full Access Master standard requests include native project_id. No project creation or hydration tool is exposed.

Creation returns native pending, pending_approval, rendering, completed or failed state. Read exact jobs rather than repeating creation. Completed generated files can be downloaded without regenerating them. Provider URLs have no documented expiry guarantee here; no renewal is invented. Browser editor URLs and signed render examples are capabilities, not completed media downloads. Editor sessions last two hours after first access and are bound to that browser. Opening signed render URLs consumes quota.

Existing layer aliases map star_rating to rating, barcode_data to bar_code_data and qr_data to target. Undocumented per-render font_size/font_weight fields are explicitly refused; set these in the template editor. Legacy video zoom and blur toggles map true to center and blur intensity 1, while false omits the effect. Whole-second trimFrom maps to HH:MM:SS; native optional position/intensity/time fields are additive. Template PATCH preserves supported dimension changes. PDF-join metadata is refused because it is not a documented V2 input.

Video frames and per-frame durations apply only to Multi Overlay templates. Overlay and Transcribe require input media. Creation receipts must match the discovered build pack and any supplied input-media URL; a returned video-template UID is checked when present without requiring an undocumented response field.

Template deletion is permanent. Generated-job deletion, cancellation or quota refunds are not promised. Private verification requires isolated synthetic resources, exact native readbacks, unchanged ownership markers and explicit acceptance of retained generation quota/history or editor/signed capabilities. There are no trigger subscriptions; supported per-request callback URLs remain optional creation inputs.
