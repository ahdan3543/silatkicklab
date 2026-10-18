SILAT MOTION - 3D LAB FULLSCREEN FIX

- Fullscreen observasi biomekanika is rendered through a portal to document.body so parent layout/padding cannot offset it.
- Uses 100vw x 100dvh and removes body/html overflow while active.
- Added fullscreenchange handling so state stays synchronized when browser exits fullscreen.
- 3D Lab retains explicit camera Zoom In and Zoom Out controls in Pose3DOverlay.
- Existing 3D camera zoom range remains 1.4-4.0 and reset restores the default view.
