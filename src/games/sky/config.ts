/** Every tunable number of the sky game lives here. Distances are in world units. */
export const SKY = {
  GAME_SECONDS: 300,
  PUNCHES_PER_BOX: 3,

  /** Boxes hover at this distance from the camera; the player's glove lives on the same plane. */
  PUNCH_PLANE_Z: 7,
  BOX_SPAWN_Z: 30,
  FIRST_BOX_DISTANCES: [14, 24],
  BOX_APPROACH_SPEED: 5,
  BOX_LEAVE_SPEED: 10,
  BOX_HOVER_SECONDS: 12,
  BOX_HALF_SIZE: 0.9,
  BOX_MIN_SPACING: 2.4,
  BOX_SPAWN_RANGE_X: 4.2,
  BOX_SPAWN_RANGE_Y: 1.8,
  BOX_REMOVE_Z: 1.5,
  BOX_YAW_RANGE: 0.3,

  MAX_LIVE_BOXES: 4,
  MAX_LIVE_BOXES_WHEN_NEEDED_LETTER_MISSING: 5,
  SPAWN_INTERVAL_SECONDS: 2.4,
  NEEDED_LETTER_SPAWN_DELAY_SECONDS: 0.5,
  NEEDED_LETTER_CHANCE: 0.4,

  PLAYER_LIMIT_X: 4.4,
  PLAYER_LIMIT_Y: 2.1,
  PLAYER_SPEED_X: 5,
  PLAYER_SPEED_Y: 4,
  PLAYER_SMOOTHING: 10,
  CAMERA_FOLLOW: 0.25,
  CAMERA_SMOOTHING: 4,

  PUNCH_HIT_RADIUS: 1.3,
  PUNCH_REACH_BEHIND: 2,
  PUNCH_REACH_AHEAD: 2.5,
  PUNCH_COOLDOWN_SECONDS: 0.22,
  PUNCH_ANIMATION_SECONDS: 0.25,
  BOX_SHAKE_SECONDS: 0.25,
  /** Short beat after the last punch so the break animation is seen before the letter is announced. */
  BREAK_DELAY_MS: 350,

  CLOUD_COUNT: 28,
  CLOUD_SPEED: 14,
  CLOUD_FAR_Z: 120,
  CLOUD_RESPAWN_Z: [110, 125],

  BOX_HUES: [20, 350, 260, 160, 45, 205],
} as const;
