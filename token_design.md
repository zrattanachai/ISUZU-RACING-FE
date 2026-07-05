# Design Tokens for Unified Racing Intelligence Platform

This document outlines the core design tokens implemented via Tailwind CSS to ensure a consistent, premium, and dynamic user interface.

## Colors
* **Primary (Brand)**: `hsl(210, 100%, 50%)` - Racing Blue (used for main actions, active states).
* **Secondary**: `hsl(0, 0%, 15%)` - Carbon Black (used for dark mode backgrounds, premium feel).
* **Accent**: `hsl(35, 100%, 50%)` - Alert Orange (used for warnings, live telemetry highlights).
* **Success**: `hsl(140, 100%, 40%)` - Optimal Green.
* **Danger**: `hsl(0, 100%, 50%)` - Critical Red (high engine temp, tire wear alerts).
* **Surface**: `hsl(0, 0%, 9% / 0.8)` - Glassmorphism backgrounds.

## Typography
* **Font Family**: Inter (sans-serif) for primary UI. Roboto Mono for telemetry data and numbers.
* **Scale**:
  * Title: `text-3xl font-bold tracking-tight`
  * Subtitle: `text-xl font-semibold`
  * Body: `text-base font-normal`
  * Data: `text-sm font-mono`

## Spacing & Sizing
* Built on an 8px grid system (`space-x-2`, `p-4`, etc.).
* Standard widget padding: `p-6`.
* Border Radius: `rounded-2xl` for widgets, `rounded-full` for badges/buttons.

## Animation Tokens
* **transitions**: `transition-all duration-300 ease-in-out` (smooth hover states).
* **pulse**: `animate-pulse` for live active data streams.

Token implementation will be configured within `tailwind.config.ts`.
