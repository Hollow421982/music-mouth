# Music Mouth

## Current State
- App has 10-channel mouth sound detection with real-time level meters
- Users can record mouth sounds that map to synthesized instrument sounds
- App has a MenuPanel with tabs: Actions (Save/Download/Share/BPM/Directions), Projects (load/delete saved projects), Library (instrument browser + assignment)
- Instrument library has 200+ instruments in `src/frontend/src/data/instruments.ts`
- Download currently exports recorded notes as WAV (audio rendering via OfflineAudioContext) or JSON fallback
- Playback uses Web Audio API oscillators to synthesize sounds from instrument data (baseFreq, waveform, decay)
- Backend stores projects with name, bpm, mappings, events
- $4.99 Stripe paywall gates all features; admin bypass available

## Requested Changes (Diff)

### Add
- **Instrumental Studio / Beat Builder**: A new dedicated view/mode where users can compose an instrumental by arranging instruments on a grid/sequencer (step sequencer or pattern-based). They can select from the full instrument library, set notes on a timeline, and build multi-track compositions independent of mouth-sound recording.
- **Massively expanded instrument library**: Expand the instrument list to cover every instrument ever recorded — by greatly expanding categories and entries in `instruments.ts`. Target 500+ instruments spanning all world music traditions, orchestral, electronic, folk, historical/ancient, and modern instruments.
- **Enhanced project download**: Ensure the download flow exports the project as a WAV audio file that users can actually use. The WAV export should cover both: (1) recorded mouth-sound beats AND (2) instrumentals composed in the Beat Builder. Also offer a JSON project export option as a secondary download format.

### Modify
- **MenuPanel**: Add a fourth tab "Studio" (or make it accessible from Actions) that opens the Instrumental Studio.
- **App.tsx**: Add state and routing for the Studio mode. When the user opens Studio, show the Beat Builder interface.
- **instruments.ts**: Massively expand the instrument database to 500+ entries across all world traditions.
- **useAudioEngine.ts**: Add a function to render/export a multi-track instrumental (from the Beat Builder pattern) to WAV using OfflineAudioContext.

### Remove
- Nothing removed

## Implementation Plan
1. Expand `instruments.ts` to 500+ instruments across all world traditions and categories.
2. Add a `BeatBuilder` component: step sequencer grid with configurable instruments per track (up to 8 tracks), 16-step grid, BPM sync, play/stop, clear. Each track lets user pick an instrument from the full library.
3. Add `useBeatBuilder` hook: manages grid state (tracks x steps), playback via Web Audio scheduler, export to WAV.
4. Add Studio tab to MenuPanel (or a separate full-screen Studio view accessible from the main Actions tab).
5. Wire a "Create Instrumental" button in the main UI that opens the Studio/BeatBuilder.
6. Ensure download in MenuPanel offers both WAV (audio) and JSON (project data) clearly labeled.
7. Backend `createProject` already supports projects — no backend changes needed; all studio state is frontend-local with download/save options.
