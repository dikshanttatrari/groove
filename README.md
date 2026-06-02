# 🎧 Groove

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-success?style=for-the-badge)

Groove is a premium, offline-first music streaming Progressive Web App (PWA). Built with a focus on performance and native-like user experience, it features a custom-built offline audio engine that bypasses standard browser caching to store complete audio binaries and cover art directly on the device.

## ✨ Features

- **True Offline Mode:** Download individual tracks or batch-download entire playlists. Audio files are stored as raw `Blob` data in `IndexedDB`, allowing thousands of songs to be saved locally without hitting standard `localStorage` limits.
- **"Living" Synced Lyrics:** Time-synced, auto-scrolling lyrics powered by LRCLIB. Features a cinematic "Canvas" overlay with GPU-accelerated depth-of-field transitions (blur/scale) that keep the text sharp and layout-shift-free.
- **Ultra-Premium Glassmorphism:** Native-feeling bottom sheet modals (for Queue, Playlists, and settings) utilizing heavy `backdrop-filter` blurs and translucent overlays to let the dynamic player colors bleed through smoothly.
- **Dynamic Poster Generation:** Built-in `<canvas>` engine dynamically generates high-resolution, gradient-rich share posters for songs, integrating flawlessly with the native Web Share API.
- **PWA Ready:** Installable on iOS and Android straight from the browser with responsive safe-area insets for mobile notches (Dynamic Island).
- **Smart Queueing:** Seamlessly transitions between network-fetched recommendations and predefined offline queues when the internet is disconnected.
- **Background-Proof Sleep Timer:** Built with absolute Unix timestamps to guarantee accurate timeout execution, even when the mobile browser aggressively throttles background JavaScript intervals.
- **Custom Event Syncing:** Utilizes a custom Publish/Subscribe architecture to sync download states across the Library, Player, and Playlist screens instantly without prop-drilling.

## 🏗️ Architecture Highlights

### The "App-Managed" Download
Instead of relying on the browser's public download manager (which clutters the user's phone gallery and files), Groove utilizes a "Silent Download" architecture:
1. Audio is fetched directly as a binary stream.
2. The binary `Blob` is written into a sandboxed `IndexedDB` instance.
3. Upon playback, `URL.createObjectURL()` generates a temporary local pointer to the browser's memory, completely decoupling the player from the network.

### Lyric Sync & Layout Thrashing Prevention
To avoid browser "layout thrashing" during fast-paced lyric syncing, the UI relies strictly on GPU-accelerated CSS properties (`transform: scale` and `filter: blur`) rather than animating font weights or sizes. This ensures a buttery smooth 60fps scrolling experience even on low-end mobile devices.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dikshanttatrari/groove.git
   cd groove
