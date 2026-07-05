/**
 * Pure helpers for chat-message visibility classification. No Foundry globals,
 * so tests can import directly.
 */

export type RollMode = 'public' | 'self' | 'gm' | 'blind';

export interface DeriveRollModeInput {
    blind?: boolean;
    whisper?: string[] | null;
    author?: { id?: string | null } | null;
    /**
     * Persisted roll mode set at message creation in roll-execute.ts. When
     * present this wins outright — Foundry's whisper/blind alone can't
     * distinguish a single-GM /gmroll from a /selfroll (both have whisper
     * === [author.id]).
     */
    flags?: { "nonex-ist-od6s"?: { rollMode?: string } } | null;
}

/**
 * Canonical Foundry v14 message-visibility modes — keys of
 * `CONFIG.ChatMessage.modes`, passed as the `messageMode` option to
 * `Roll#toMessage` / `Combat#rollInitiative`. Replaces the deprecated
 * `CONST.DICE_ROLL_MODES`, whose `PUBLIC`/`PRIVATE`/`BLIND`/`SELF` returned the
 * old `publicroll`/`gmroll`/`blindroll`/`selfroll` strings.
 */
export const MESSAGE_MODES = {
    PUBLIC: 'public',
    GM:     'gm',
    BLIND:  'blind',
    SELF:   'self',
} as const satisfies Record<string, RollMode>;

/**
 * Classify a persisted mode flag into one of the four modes. Accepts both the
 * current `messageMode` values and the legacy pre-v14 `publicroll`/… strings
 * that historical chat messages still carry in `flags.nonex-ist-od6s.rollMode`.
 */
const PERSISTED_TO_MODE: Record<string, RollMode> = {
    // current messageMode keys
    public: 'public',
    gm:     'gm',
    blind:  'blind',
    self:   'self',
    // legacy pre-v14 rollMode strings (still present on older messages)
    publicroll: 'public',
    gmroll:     'gm',
    blindroll:  'blind',
    selfroll:   'self',
};

/**
 * Classify a chat message into one of four modes. Prefers the persisted
 * `flags.nonex-ist-od6s.rollMode` set by our roll dialog; falls back to deriving from
 * Foundry's blind/whisper/author for messages we didn't author (typed
 * `/gmroll`, third-party modules, pre-existing history).
 */
export function deriveRollMode(msg: DeriveRollModeInput): RollMode {
    const persisted = msg?.flags?.["nonex-ist-od6s"]?.rollMode;
    if (persisted && PERSISTED_TO_MODE[persisted]) return PERSISTED_TO_MODE[persisted];

    if (msg?.blind) return 'blind';
    const whisper = Array.isArray(msg?.whisper) ? msg.whisper : [];
    if (!whisper.length) return 'public';
    const authorId = msg?.author?.id ?? null;
    if (authorId && whisper.length === 1 && whisper[0] === authorId) return 'self';
    return 'gm';
}
