import OD6S from "../../config/config-od6s";
import { getDiceFromScore } from "./dice";
import { getScoreFromSkill } from "./skills";
import { isCharacterActor, isWeaponItem } from "../type-guards";
import { MESSAGE_MODES } from "../../hooks/chat-mode";

/**
 * Calculate Strength Damage die code from a Strength die count.
 * Rule: drop pips, divide by 2, round up. (Book p71, "Determining Strength Damage")
 */
export function strengthDamageFromDice(strengthDice: number): number {
    return Math.ceil(strengthDice / 2);
}

/**
 * Return range values for ranged weapons
 */
export async function getWeaponRange(actor: Actor, item: Item): Promise<Record<string, number> | false> {
    const regex = /[A-Za-z]/;
    type RangeBucket = { short: string; medium: string; long: string };
    const foundRange: RangeBucket = { short: '', medium: '', long: '' };

    if (!isWeaponItem(item)) return false;
    const itemRange = item.system.range;
    const range: RangeBucket = {
        short: itemRange.short,
        medium: itemRange.medium,
        long: itemRange.long,
    };

    const numericRange = {
        short: Number(itemRange.short),
        medium: Number(itemRange.medium),
        long: Number(itemRange.long),
    };

    let baseDice;

    if (regex.test(itemRange.short) ||
        regex.test(itemRange.medium) ||
        regex.test(itemRange.long)) {
        // There is a non-numeric value, extract it and find the attribute
        for (const rangeKey of ['short', 'medium', 'long'] as const) {
            for (const attr in OD6S.attributes) {
                if (itemRange[rangeKey].toLowerCase().includes(attr)) {
                    foundRange[rangeKey] = attr;
                    break;
                }
            }
            if (foundRange[rangeKey] === '') {
                // String is present, but attribute not found.  Flee!
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_INVALID_RANGE_ATTRIBUTE'));
                return false;
            }
        }
    } else {
        // No strings in range values — coerce to numbers so the return type matches.
        return numericRange;
    }
    if ((new Set([foundRange.short, foundRange.medium, foundRange.long])).size === 1) {
        baseDice = Math.floor(actor.system.attributes[foundRange.short].score / OD6S.pipsPerDice) * OD6S.pipsPerDice;
        if (!game.settings.get('nonex-ist-od6s', 'strength_damage')) {
            // CHeck for a lift skill
            const lift = actor.items.find((skill: Item) => skill.name === game.i18n.localize("NONEX_IST_OD6S.LIFT"));
            if (lift != null && typeof (lift) !== 'undefined') {
                baseDice = getScoreFromSkill(actor, '', lift.name, 'str');
            }
        }
    } else {
        // Range attribute does not match, flee.
        ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_INVALID_RANGE_ATTRIBUTE'));
        return false;
    }

    const newRanges: Record<string, number> = {};
    const dice = getDiceFromScore(baseDice, OD6S.pipsPerDice);

    if (game.settings.get('nonex-ist-od6s', 'static_str_range')) {
        for (const r of Object.keys(range) as (keyof RangeBucket)[]) {
            const e = range[r].match(/([+|-][0-9])$/);
            if (e) {
                newRanges[r] = (dice.dice * 4) + dice.pips + (+e[0]);
            } else {
                newRanges[r] = (dice.dice * 4) + dice.pips;
            }
        }
    } else {
        //Generate a die roll
        let rollString = dice.dice + "d6";
        if (dice.pips > 0) rollString = rollString + "+" + dice.pips;
        const roll = await new Roll(rollString).evaluate();

        for (const r of Object.keys(range) as (keyof RangeBucket)[]) {
            const e = range[r].match(/([+|-][0-9])$/);
            if (e) {
                newRanges[r] = roll.total + (+e[0]);
            } else {
                newRanges[r] = roll.total;
            }
        }

        const flags = {
            type: "range",
            range: newRanges,
            origRange: range,
        };
        const label = game.i18n.localize('NONEX_IST_OD6S.RANGE_ROLL') + ": " + item.name;
        let messageMode: string = MESSAGE_MODES.PUBLIC;
        if (game.user.isGM && game.settings.get('nonex-ist-od6s', 'hide-gm-rolls')) messageMode = MESSAGE_MODES.GM;
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker(),
            flavor: label,
            flags: {
                "nonex-ist-od6s": flags
            },
        }, {messageMode, create: true})
    }
    return newRanges;
}

export function getMeleeDamage(actor: Actor, weapon: Item): number {
    if (!isWeaponItem(weapon)) return 0;
    const wsys = weapon.system;
    if (wsys.damage.str && isCharacterActor(actor)) {
        return (+actor.system.strengthdamage.score) + (+wsys.damage.score);
    } else {
        return (+wsys.damage.score);
    }
}
