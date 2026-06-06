# Test: Large PDF Fallback

## Input

Upload a legal PDF with more than 1000 pages while using Gemini.

## Expected Behavior

- The app detects the page count.
- It does not send the raw PDF directly to Gemini.
- It extracts selectable text or runs OCR fallback when needed.
- The learner sees progress text instead of a raw Gemini page-limit error.

