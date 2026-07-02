Now let me get more details on the webhook/callback functionality and transcript output formats.Now I have all the information needed. Let me compile the specification.

# Slates Specification for Castingwords

## Overview

CastingWords is a human-powered transcription service that converts audio and video content into text. It offers multiple transcription tiers (Budget, 7 Day, 1 Day) with add-on options like timestamps, captions, and verbatim transcription. The API allows programmatic ordering, status tracking, and retrieval of completed transcripts.

## Authentication

Authentication is via a secret API key posted in the HTTPS URL or as JSON in the POST body (preferred).

- **Method**: API Key
- **Key retrieval**: You may retrieve your secret key from your account at `https://castingwords.com/customer/info`.
- **Usage**: Include the `api_key` parameter either as a URL query parameter (e.g., `?api_key=YOUR_KEY`) or in the JSON POST body (e.g., `{"api_key": "YOUR_KEY"}`).
- Using the API requires a free CastingWords account. Once activated, retrieve the API key from your settings page. Set up a billing credit card to enable order placement.

## Features

### Order Transcriptions

Submit audio or video files for transcription by providing a URL to the media file. Accepts many URLs and many SKUs, with all SKUs being applied to every URL.

- **Transcription tiers**: Budget (TRANS14), 7 Day (TRANS6/TRANS7), and 1 Day (TRANS2).
- **Add-ons**: Difficult Audio (DIFFQ2), Timestamps (TSTMP1), Captions (CAPTION1), Verbatim (VERBATIM1).
- **Optional metadata**: Speaker names and notes/comments for transcribers can be included with orders.
- A test mode is available for creating orders that will not actually be transcribed.

### Retrieve Transcripts

Download completed transcripts in multiple formats.

- **Supported formats**: Plain text (.txt), Word document (.doc), RTF (.rtf), and HTML (.html).
- Transcripts are retrieved by audiofile ID.

### Track Audiofile Status

Query the current status and details of a submitted audiofile. Returns properties including the current state, speaker names, notes, original link, title, duration, audiofile ID, description, quality rating (5-star system), associated order and invoice IDs, and cost.

- Audiofiles pass through various states such as Audio Processing, Transcribing, Awaiting Edit, Delivered, Error, Refunded, etc.

### Upgrade Orders

Upgrade an existing audiofile order after initial submission.

- Available upgrades: Difficult Audio, Timestamps, Extra Editing, and tier upgrades (e.g., Budget to 7 Day, Budget to 1 Day, 7 Day to 1 Day).

### Cancel / Refund Audiofiles

Cancel an audiofile order and receive a refund. Only works when no transcription work has been done on the file (e.g., in Pre-Processing, Audio Processing, or Error states).

### View Invoice Details

Retrieve detailed invoice information including line items, SKUs, quantities, prices, associated audiofiles, and payment timestamps.

### Check Prepay Balance

Query the current prepay balance in USD for the account.

## Events

CastingWords supports webhooks for asynchronous event notifications. A single webhook URL is registered per account, and CastingWords sends an HTTP POST to that URL when events occur. You can also trigger test webhook calls for verification.

### Transcript Complete

Fired when a transcription has been completed. Includes the audiofile ID, order ID, and the original media URL.

### Duplicate File

Fired when CastingWords detects that a submitted file has been ordered before. Includes the audiofile ID of the new submission and the ID of the previously transcribed original file.

### Refund Issued

Fired when a refund has been issued to the CastingWords prepay balance. Includes the refund amount, associated order, and transaction IDs.

### Difficult Audio

Fired when CastingWords determines that a submitted file contains difficult audio. Includes the audiofile ID and order ID.
