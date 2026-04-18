# Hedgehog Humidity Card

A compact pill card for Home Assistant that displays the humidity range across multiple sensors at a glance. Tap to explore all your sensors in an overview popup, then tap any sensor pill to view a selectable time-range history graph.

## Key Features

- **Compact pill design** — a slim 56px card shows the humidity range (min–max) across all your selected sensors at a glance; title is optional
- **Auto-detection** — the visual editor automatically finds all humidity sensors in your Home Assistant instance (device_class: humidity with % unit); no manual entity ID typing needed
- **Sensor overview popup** — tap the pill to open a popup showing each sensor as its own pill with the current reading, plus a stats bar for Low, In Range, and High values across all sensors; tap any stat to highlight the matching sensor pills
- **Time-range history graph** — tap any sensor pill to open a graph popup with a 1h / 3h / 6h / 12h / 24h segmented time selector and a smooth SVG line graph with an interactive crosshair
- **Comfort level indicator** — the graph popup displays a contextual comfort banner (e.g. 😊 Ideal humidity, 🏜️ Too dry) based on your thresholds or standard indoor comfort bands
- **Humidity thresholds** — set an optional minimum and maximum humidity; the graph line changes colour (warm amber below minimum, accent in range, fresh green above maximum) with dashed threshold lines shown on the graph
- **Friendly names** — assign a custom display name to any sensor directly in the visual editor
- **Drag-to-reorder** — drag selected sensors in the visual editor to set the order they appear in the overview popup
- **Decimal precision** — choose 0–3 decimal places for all humidity displays
- **Full colour control** — customise pill background, text, accent, low humidity, high humidity, popup background and droplet icon colours with native colour pickers

## Quick Start

```yaml
type: custom:hedgehog-humidity-card
entities:
  - sensor.living_room_humidity
  - sensor.bedroom_humidity
  - sensor.outdoor_humidity
title: Humidity
decimals: 1
accent_color: '#32ADE6'
icon_color: '#32ADE6'
```

All settings can be configured through the built-in visual editor — no YAML editing required!
