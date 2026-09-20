# Carrier Flight

A browser-based 3D carrier flight combat game built with [Three.js](https://threejs.org/). No build step, no external assets — every model, texture, and sound is generated procedurally in the browser.

Take off from your carrier, hunt down enemy fighters, SAM ships, and two hostile carrier task forces, and make it back to base alive.

## Running it

Any static file server works, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

## Controls

**Keyboard**
- `W` / `S` — pitch
- `A` / `D` — roll
- `Q` / `E` — yaw
- `Shift` / `Ctrl` — throttle up/down
- `Space` — fire (machine gun, hold)
- `B` — drop bomb
- `F` — fire missile (requires a lock)
- `C` — deploy countermeasures
- `` ` `` (backtick) — toggle debug overlay

**Gamepad**
- Left stick / D-pad — pitch/roll
- Right stick — yaw
- Triggers — throttle
- Face buttons — fire / bomb / missile / countermeasures (remappable in Settings)

Press fire while on the carrier deck to launch. Fly close to your home carrier to resupply bombs and missiles (once per minute).

## Features

- Full 3D flight physics with a chase camera, shared between the player and every AI-controlled plane
- Machine gun, bombs, and lock-on homing missiles, with a reticle that tracks valid targets
- Enemy fighters (patrol/chase/evade AI), SAM ships with distance-based accuracy and an audible inbound-missile warning, and two boss carriers that flee and fire flak bursts
- Countermeasures (chaff) that blocks incoming damage for a few seconds, with a trailing glitter effect
- Mission flow that keeps a run going until your own in-flight projectiles resolve, so a killing blow still counts even if you don't survive to see it land
- HUD, minimap, and a settings screen for remapping controls, Y-invert, and starting loadout

## Project structure

```
src/plane/       shared flight physics + player flight controller
src/ai/          enemy AI (fighters, SAM ships, boss carriers) and steering
src/combat/      weapons, homing, collision/health, particles, wave spawning
src/scene/       ocean, sky, carrier, procedural textures, enemy/projectile models
src/camera/      chase camera + damage shake
src/input/       keyboard/gamepad input, merging, and remapping
src/config/      persisted player settings
src/ui/          HUD, reticle, minimap, mission overlay, settings screen
src/audio/       procedural WebAudio sound effects
```
