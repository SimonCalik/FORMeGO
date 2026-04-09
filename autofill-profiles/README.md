<!-- README.md - Quick install and usage guide for the FORMeGO extension. -->
# FORMeGO

Simple Chrome/Edge extension (Manifest V3) for filling forms from saved profiles.

## Install (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select folder: `autofill-profiles`.

## Usage

1. Open extension Options and create at least one profile.
2. On any website, focus an input or textarea.
3. Select a profile in the floating menu to autofill.
4. Click `✎` in the popover to open profile settings.

## Storage

Profiles are stored in `chrome.storage.sync` under key `profiles` as array items:

```json
[
  {
    "id": "me",
    "label": "Ja",
    "data": {
      "firstName": "",
      "lastName": "",
      "fullName": "",
      "email": "",
      "phone": "",
      "address1": "",
      "city": "",
      "zip": ""
    }
  }
]
```
