# Slates Specification for Plate Recognizer

## Overview

Plate Recognizer provides automatic license plate recognition (ALPR) software that reads license plates from images and video feeds. The ALPR engine supports over 90 countries and also offers additional recognition products including VIN extraction, shipping container identification, USDOT number reading, trailer ID, boat ID, and license plate/face blurring. They provide both cloud and on-premise software.

## Authentication

Plate Recognizer uses **API Token authentication**. Users sign up for an account and get an API Token, which must be included in all API calls.

The token is passed via the `Authorization` HTTP header in the format:

```
Authorization: Token YOUR_API_TOKEN
```

For example: `Authorization: Token abcdef123456xxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

Tokens can be obtained from the Plate Recognizer dashboard. The same token-based authentication method is used across all Plate Recognizer Cloud API products (Snapshot, Blur, VIN ID, TrailerID, USDOT, BoatID, etc.).

## Features

### License Plate Recognition (Snapshot)

Read license plates from images by submitting an image file or image URL. Decodes license plate text, vehicle type (e.g., SUV, van, pickup truck), vehicle make and model (e.g., Honda Accord), color, and orientation.

- **Region filtering**: Specify one or more regions (countries/states) to improve recognition accuracy. Supports strict region matching mode.
- **Detection mode**: Can detect plates only (default) or all vehicles including those without visible plates (`vehicle` mode).
- **Configuration options**: Adjustable detection/OCR confidence thresholds, fast mode for lower latency, text format patterns via regex, and zoom-in for high-resolution images.
- Can return up to 5 decoded license plates from one image.

### License Plate and Face Blurring

Blur license plates and faces in images. Available via cloud API (`blur.platerecognizer.com`) or on-premise SDK.

- Configurable blur intensity for both plates and faces (scale of 1–10).
- Option to overlay a custom logo instead of blurring.
- Handles both images and video files.
- Returns accurate polygon bounding box coordinates in JSON format.

### VIN Recognition

Extract VIN (Vehicle Identification Number) from images with high accuracy.

- Submit an image file or URL containing a VIN label/sticker.
- Returns the decoded VIN text with confidence scores.

### Shipping Container Recognition

Reads shipping container identification codes from images, including serial numbers, owner codes, and size/type codes.

### TrailerID

Extract trailer identification numbers from images.

### USDOT OCR

Reads USDOT numbers from images, handling blurry, low-resolution, and angled captures.

### BoatID

Reads boat registration numbers from images.

### Usage Statistics

Get the number of recognition calls done during the current month. Available for each product (Snapshot, VIN, TrailerID, etc.) via dedicated statistics endpoints. Returns monthly call count, total allowed calls, and reset date.

## Events

Plate Recognizer supports webhooks for both its **Snapshot API** (Cloud and SDK) and **Stream** product.

### Snapshot Webhooks (image.done)

Webhooks send an HTTP POST to your URL every time a plate is decoded in the Cloud API or SDK engine. A webhook is sent for each call to the recognition API, even when no license plate is found.

- Two types of webhooks can be configured: "Data Only" and "Webhook with Image". Data Only sends a JSON payload; Webhook with Image sends multipart form data including the processed image.
- You can construct one or multiple webhooks per API Cloud account or SDK license.
- Webhook targets are managed via the Plate Recognizer dashboard settings page.

### Stream Webhooks (recognition)

When using the Stream product (live camera/video processing), webhooks fire on plate recognition events. The payload includes plate text, vehicle information (type, make, model, color, orientation), bounding boxes, camera ID, and timestamps.

- Configurable webhook image types: original frame, vehicle crop, plate crop.
- Supports sending video clips alongside recognition data.

### Stream Webhooks (dwell_time)

When a vehicle disappears from view, Stream sends a webhook with dwelling time information, including how long the vehicle was visible, first/last seen timestamps, and optionally the vehicle's trajectory.

- Configurable delay before sending (`max_dwell_delay`).
- Dwell time works for vehicles without license plates as well.
- Optional trajectory tracking can be enabled.
