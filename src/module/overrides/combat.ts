import {od6sutilities} from "../system/utilities";

export class OD6SCombat extends Combat {

    /**
     * Advance the combat to the next round.
     * Explosives detonate at the end of the round (before the round changes),
     * then core handles the round advance.
     */
    async nextRound() {
        if (game.settings.get('nonex-ist-od6s', 'auto_explosive') && game.settings.get('nonex-ist-od6s', 'explosive_end_of_round')) {
            await od6sutilities.detonateExplosives(this);
        }
        return super.nextRound();
    }

}
