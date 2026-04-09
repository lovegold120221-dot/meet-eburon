# Orbit Translator Embed Widget

A single-file script to add a floating translator button to any website.

## Usage

1. Copy `orbit-translator-widget.js` to your server.
2. Add this snippet to your page body:

```html
<script
  src="https://YOUR_DOMAIN/path/to/orbit-translator-widget.js"
  data-orbit-url="https://YOUR_DOMAIN/callcenter/index.html"
  data-target="English"
  data-autostart="1"
  data-position="br"
></script>
```

## Options

| Attribute | Default | Description |
|-----------|---------|-------------|
| `src` | required | Path to the widget script. |
| `data-orbit-url` | required | URL of your hosted translator page (index.html). |
| `data-target` | English | Target language for translation. |
| `data-autostart` | 1 | Automatically connect mic when the overlay opens. |
| `data-position` | br | br (bottom-right), bl, tr, tl. |
| `data-label` | Translate | Tooltip label text. |
| `data-size` | 56 | Button size in px. |
| `data-z` | 2147483000 | Z-index override. |

## Run Locally

```bash
python3 -m http.server 8080
# Open http://localhost:8080/embed/demo-embed.html
```
