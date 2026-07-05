import {isCharacterActor} from "../system/type-guards";

/**
 * A chat-message context-menu entry in the v14 shape: `label`/`visible`/
 * `onClick` (the v13 `name`/`condition`/`callback` fields are deprecated), with
 * callbacks receiving the message row as an `HTMLElement` (no longer jQuery).
 */
interface ChatContextEntry {
    label: string;
    icon: string;
    visible: (li: HTMLElement) => boolean;
    onClick: (event: Event, li: HTMLElement) => unknown;
}

export class OD6SChat {

    /** Resolve the acting Actor for a chat message row (token actor if any). */
    private static resolveActor(li: HTMLElement): Actor | undefined {
        const message = game.messages.get(li.dataset.messageId ?? "");
        if (!message?.speaker.actor) return undefined;
        if (message.speaker.token) {
            return game.scenes.viewed?.tokens.find(t => t.id === message.speaker.token)?.actor ?? undefined;
        }
        return game.actors.get(message.speaker.actor) ?? undefined;
    }

    /**
     * Append the "Use a Character Point" entry to the chat message context menu.
     * Registered via the `getChatMessageContextOptions` hook (v14).
     */
    static chatContextMenu(options: ChatContextEntry[]) {
        options.push({
            label: game.i18n.localize("NONEX_IST_OD6S.USE_A_CHARACTER_POINT"),
            icon: '<i class="fas fa-user-plus"></i>',
            visible: (li: HTMLElement) => {
                if (!li.querySelector(".dice-roll")) return false;
                const message = game.messages.get(li.dataset.messageId ?? "");
                if (!message) return false;
                const actor = OD6SChat.resolveActor(li);
                return !!(
                    message.getFlag('nonex-ist-od6s', 'canUseCp') &&
                    actor && (game.user.isGM || actor.isOwner) &&
                    isCharacterActor(actor) &&
                    (actor.type === "character" || actor.type === "npc") &&
                    actor.system.characterpoints.value > 0
                );
            },
            onClick: (_event: Event, li: HTMLElement) => {
                const message = game.messages.get(li.dataset.messageId ?? "");
                if (!message) return;
                const actor = OD6SChat.resolveActor(li);
                if (!actor) return;
                return actor.useCharacterPointOnRoll(message);
            },
        });
    }
}
