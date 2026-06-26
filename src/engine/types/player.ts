/**
 * Unique identifier for a player within a game session.
 * The engine uses PlayerId to distinguish whose hand, captures, and score to track.
 *
 * Must NOT carry NPC name, region, story context, or UI display data.
 * Content-layer identity (NPC name, avatar) is mapped to PlayerId in the Application layer.
 */
export type PlayerId = string;

/**
 * Whether a player seat is controlled by a human or the AI.
 * Determines how the Application layer sources GameActions for that seat.
 */
export type PlayerKind = 'human' | 'ai';
