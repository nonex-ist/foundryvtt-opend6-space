import {od6sInitRoll} from "../apps/init-roll";
import {MESSAGE_MODES} from "../hooks/chat-mode";

export class OD6SCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
    /**
     * Divert single-combatant init rolls for characters into the OD6S init dialog
     * (skill choice, character-point spend, wild die). For non-character combatants,
     * preserve Foundry's default flow but route the result message via "gm" mode
     * when `hide-gm-rolls` is enabled.
     */
    _onRollInitiative(combatant: any) {
        if (combatant.actor?.type === "character") {
            void od6sInitRoll._onInitRollDialog(this.viewed, combatant);
            return undefined;
        }
        const options: {messageMode?: string} = {};
        if (game.user.isGM && game.settings.get("nonex-ist-od6s", "hide-gm-rolls")) {
            options.messageMode = MESSAGE_MODES.GM;
        }
        return this.viewed.rollInitiative([combatant.id], options);
    }
}
