# 🦔 Hedgehog Humidity Card

[![HACS Badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge&logo=homeassistantcommunitystore&logoColor=white)](https://github.com/jamesmcginnis/hedgehog-humidity-card)

[![Add to Home Assistant](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=hedgehog-humidity-card&category=plugin)

A compact, pill-shaped Lovelace card for Home Assistant that displays humidity readings across multiple sensors at a glance. Tap the pill to open a sensor overview popup, then tap any individual sensor to view a historical graph with selectable time ranges.

---

## Features

- **Compact pill design** — shows the live humidity range (min–max) across all configured sensors in a single, space-efficient card
- **Sensor overview popup** — tap the card to open a bottom sheet showing Low / In Range / High stats and individual sensor pills in a 3-column grid; tap a stat to highlight the matching sensor pills
- **History graph popup** — tap any sensor pill to see a detailed SVG line graph with selectable time ranges: 1h, 3h, 6h, 12h, 24h, and an interactive crosshair showing value and timestamp at any point
- **Comfort level indicator** — the graph popup shows a contextual comfort banner (e.g. 😊 Ideal humidity, 🏜️ Too dry, 💦 Too humid) based on your configured thresholds or standard indoor humidity bands
- **Threshold colouring** — optionally set low and high thresholds; graph lines change colour automatically when readings fall outside range, with dashed threshold lines drawn on the graph
- **Fully customisable colours** — seven colour fields with native colour pickers and hex inputs in the visual editor
- **Custom display names** — override the Home Assistant friendly name per sensor directly in the editor
- **Drag-to-reorder sensors** — reorder sensors in the editor with drag-and-drop (mouse and touch)
- **Sensor metadata** — the graph popup surfaces last updated time, battery level, device class, and min/max attributes where available
- **HACS compatible** — includes card registration and a full visual editor (`getConfigElement`)

---

## Installation

### Via HACS (recommended)

1. Open **HACS** in your Home Assistant sidebar
2. Go to **Frontend**
3. Click the **⋮** menu → **Custom repositories**
4. Add `https://github.com/jamesmcginnis/hedgehog-humidity-card` with category **Lovelace**
5. Search for **Hedgehog Humidity Card** and click **Install**
6. Reload your browser

### Manual

1. Download `hedgehog-humidity-card.js` from the [latest release](https://github.com/jamesmcginnis/hedgehog-humidity-card/releases)
2. Copy it to `config/www/hedgehog-humidity-card.js`
3. In Home Assistant go to **Settings → Dashboards → Resources** and add:
   - URL: `/local/hedgehog-humidity-card.js`
   - Resource type: **JavaScript module**
4. Reload your browser

---

## Usage

### Adding via the UI editor

1. Edit your dashboard and click **+ Add Card**
2. Search for **Hedgehog Humidity Card** and select it
3. Use the visual editor to add sensors, set thresholds, and customise colours

The editor automatically detects all humidity sensors in your Home Assistant instance (sensors with `device_class: humidity` and a `%` unit of measurement). Toggle any sensor to add it, drag the grip handle to reorder.

### Manual YAML configuration

```yaml
type: custom:hedgehog-humidity-card
title: Humidity
entities:
  - sensor.living_room_humidity
  - sensor.bedroom_humidity
  - sensor.bathroom_humidity
low_threshold: 40
high_threshold: 60
decimals: 1
```

---

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `entities` | list | `[]` | List of humidity sensor entity IDs to display |
| `title` | string | `''` | Optional label shown on the left of the pill |
| `decimals` | number | `1` | Number of decimal places for humidity values (0–3) |
| `low_threshold` | number | `null` | Readings below this value are coloured with `low_color` |
| `high_threshold` | number | `null` | Readings above this value are coloured with `high_color` |
| `friendly_names` | map | `{}` | Override display names per entity, e.g. `sensor.x: "Kitchen"` |

### Colour options

| Option | Default | Description |
|---|---|---|
| `pill_bg` | `#1c1c1e` | Background colour of the main pill card |
| `text_color` | `#ffffff` | Primary text colour for values and labels |
| `accent_color` | `#32ADE6` | Graph line colour for in-range readings and accent highlights |
| `low_color` | `#FF9F0A` | Graph line colour for readings below `low_threshold` |
| `high_color` | `#30D158` | Graph line colour for readings above `high_threshold` |
| `popup_bg` | `#1c1c1e` | Background colour of all popup dialogs |
| `icon_color` | `#32ADE6` | Colour of the droplet icon on the pill |

All colour options can be set via the visual editor using the built-in colour picker or by entering a hex value directly.

---

## Full YAML example

```yaml
type: custom:hedgehog-humidity-card
title: Home Humidity
entities:
  - sensor.living_room_humidity
  - sensor.bedroom_humidity
  - sensor.bathroom_humidity
  - sensor.office_humidity
decimals: 1
low_threshold: 40
high_threshold: 65
friendly_names:
  sensor.living_room_humidity: Living Room
  sensor.bedroom_humidity: Bedroom
  sensor.bathroom_humidity: Bathroom
  sensor.office_humidity: Office
pill_bg: "#1c1c1e"
text_color: "#ffffff"
accent_color: "#32ADE6"
low_color: "#FF9F0A"
high_color: "#30D158"
popup_bg: "#1c1c1e"
icon_color: "#32ADE6"
```

---

## How it works

**Pill card** — displays the lowest and highest current readings across all configured sensors (e.g. `42.3–58.1%`). If only one sensor is configured, it shows a single value.

**Overview popup** — tapping the pill opens an animated bottom sheet with:
- A summary bar showing the current Low, In Range, and High values across all sensors; tap any stat pill to highlight the matching sensors in the grid
- A 3-column grid of individual sensor pills, each coloured relative to the spread of readings (amber for the lowest, accent for the middle, green for the highest)
- Tapping any sensor pill opens the graph popup for that sensor

**Graph popup** — shows the current reading as a large figure, a comfort level banner with emoji and advice, a segmented time-range control (1h / 3h / 6h / 12h / 24h), and an SVG history graph fetched from the Home Assistant recorder. Drag or click anywhere on the graph to show an interactive crosshair displaying the exact value and timestamp at that point. Graph line colour respects the configured thresholds. A metadata section shows last updated time, battery level, and device class where available.

> **Note:** When both `low_threshold` and `high_threshold` are set, the In Range stat in the overview popup shows how many sensors are currently within range (e.g. `3 / 4`). Without thresholds set, it shows `—`.

---

## Requirements

- Home Assistant 2023.x or newer
- The [Recorder integration](https://www.home-assistant.io/integrations/recorder/) enabled (required for history graphs)
- One or more `sensor` entities with a `unit_of_measurement` of `%` and a `device_class` of `humidity` (though any numeric sensor with a `%` unit will work)

---

## Contributing

Pull requests and issues are welcome. Please open an issue before making large changes so we can discuss the approach first.

---

## Licence

MIT — see [LICENSE](LICENSE) for details.
