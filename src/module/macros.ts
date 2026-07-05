import OD6S from "./config/config-od6s";
import {MESSAGE_MODES} from "./hooks/chat-mode";

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createOD6SMacro(data: any, slot: number) {

    if (data.type !== "Item") return;
    if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.'))return ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_NOT_OWNED'));
    const item = await Item.fromDropData(data);

    // Filter out certain item types
    if (item.type === 'character-template' ||
        item.type === 'action' ||
        item.type === 'disadvantage' ||
        item.type === 'advantage' ||
        item.type === 'armor' ||
        item.type === 'gear' ||
        item.type === 'cybernetic' ||
        item.type === 'vehicle') {
        return ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_INVALID_MACRO_ITEM'));
    }

    // Create the macro command
    const command = `game["nonex-ist-od6s"].rollItemMacro("${item._id}");`;
    let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
    if (!macro) {
        macro = await Macro.create({
            name: item.name,
            type: "script",
            img: item.img,
            command: command,
            flags: {"nonex-ist-od6s.itemMacro": true}
        });
    }
    await game.user.assignHotbarMacro(macro, slot);
    return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemId
 * @return {Promise}
 */
export function rollItemMacro(itemId: string) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    const item = actor ? actor.items.find((i: Item) => i.id === itemId) : null;
    if (!item) return ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_NO_ITEM_ID') + " " + itemId);

    // Trigger the item roll
    return item.roll();
}

/**
 * Roll a Macro from an Item name.
 * @param {string} name
 * @return {Promise}
 */
export function rollItemNameMacro(name: string) {
    name = game.i18n.localize(name);
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    const item = actor ? actor.items.find((i: Item) => i.name === name) : null;
    if (!item) return ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_NO_ITEM_NAME') + " " + name);

    // Trigger the item roll
    return item.roll();
}

/**
 * Return either the customized or translated name of an attribute, or
 * `undefined` if the key isn't registered (the call also surfaces a
 * `ui.notifications.warn` in that case).
 */
export function getAttributeName(attribute: string): string | undefined {
    attribute = attribute.toLowerCase();
    if (typeof (OD6S.attributes[attribute]) === "undefined") {
        const warnString = game.i18n.localize('NONEX_IST_OD6S.ERROR_ATTRIBUTE_KEY') + ": " + attribute;
        ui.notifications.warn(warnString);
        return undefined;
    }
    return game.i18n.localize(OD6S.attributes[attribute].name);
}

/**
 * Return either the customized or translated short name of an attribute
 * @param attribute
 * @returns {string}
 */
export function getAttributeShortName(attribute: string) {
    attribute = attribute.toLowerCase();
    return OD6S.attributes[attribute].shortName;
}

export async function simpleRoll() {
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/nonex-ist-od6s/templates/simpleRoll.html",
        {wilddie: true, dice: 1, pips: 0});
    const result = await foundry.applications.api.DialogV2.input({
        window: {title: game.i18n.localize("NONEX_IST_OD6S.ROLL")},
        content,
        ok: {label: game.i18n.localize("NONEX_IST_OD6S.ROLL")},
    });
    if (!result) return;

    await runSimpleRoll(result);
}

interface SimpleRollResult {
    dice: number;
    pips: number;
    wilddie?: boolean;
    damageroll?: boolean;
    damagetype?: string;
}

async function runSimpleRoll(result: SimpleRollResult): Promise<void> {
    let wild = false;
    let rollString = "";
    let messageMode: string = MESSAGE_MODES.PUBLIC;
    let dice = result.dice;
    const pips = result.pips;
    const damageRoll = !!result.damageroll;
    const damageType = result.damagetype;
    if (game.settings.get("nonex-ist-od6s", "use_wild_die")) {
        wild = !!result.wilddie;
    }
    if (wild) {
        dice -= 1;
        if (dice < 0) {
            ui.notifications.warn("NONEX_IST_OD6S.NOT_ENOUGH_DICE");
            return;
        }
        if (dice > 0) rollString = dice + "d6" + game.i18n.localize("NONEX_IST_OD6S.BASE_DIE_FLAVOR");
        rollString += "+1dw" + game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR");
    } else {
        rollString = dice + "d6" + game.i18n.localize("NONEX_IST_OD6S.BASE_DIE_FLAVOR");
    }
    if (pips > 0) rollString += "+" + pips;

    let label = game.i18n.localize("NONEX_IST_OD6S.ROLLING");
    if (damageRoll) {
        label += " " + game.i18n.localize("NONEX_IST_OD6S.DAMAGE") + "("
            + game.i18n.localize(OD6S.damageTypes[damageType!]) + ")";
    }
    const roll = await new Roll(rollString).evaluate();

    let flags: Record<string, unknown> = {
        type: "simple",
        wild: false,
        wildHandled: false,
        wildResult: OD6S.wildDieResult[OD6S.wildDieOneDefault],
    };
    if (damageRoll) {
        flags = {
            type: "damage",
            source: game.i18n.localize("NONEX_IST_OD6S.DAMAGE"),
            damageType,
            isOpposable: true,
            wild: false,
            wildHandled: false,
            wildResult: OD6S.wildDieResult[OD6S.wildDieOneDefault],
        };
    }

    if (game.settings.get("nonex-ist-od6s", "use_wild_die")) {
        const WildDie = roll.terms.find((d: { flavor: string }) => game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR").includes(d.flavor));
        if (WildDie!.total === 1) {
            flags.wild = true;
            if (OD6S.wildDieOneDefault > 0 && OD6S.wildDieOneAuto === 0) flags.wildHandled = true;
        }
    }

    if (game.user.isGM && game.settings.get("nonex-ist-od6s", "hide-gm-rolls")) {
        messageMode = MESSAGE_MODES.GM;
    }
    const rollMessage = await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: label,
        flags: {"nonex-ist-od6s": flags},
    }, {messageMode, create: true});

    if (flags.wild === true && OD6S.wildDieOneDefault === 2 && OD6S.wildDieOneAuto === 0) {
        const replacementRoll = JSON.parse(JSON.stringify(rollMessage.rolls[0].toJSON()));
        let highest = 0;
        for (let i = 0; i < replacementRoll.terms[0].results.length; i++) {
            if (replacementRoll.terms[0].results[i].result > replacementRoll.terms[0].results[highest].result) {
                highest = i;
            }
        }
        replacementRoll.terms[0].results[highest].discarded = true;
        replacementRoll.terms[0].results[highest].active = false;
        replacementRoll.total -= (+replacementRoll.terms[0].results[highest].result);
        const rollMessageUpdate: Record<string, unknown> = {
            system: {},
            content: replacementRoll.total,
            id: rollMessage.id,
            rolls: [replacementRoll],
        };

        if (game.user.isGM) {
            if (rollMessage.getFlag("nonex-ist-od6s", "difficulty") && rollMessage.getFlag("nonex-ist-od6s", "success")) {
                await rollMessage.setFlag("nonex-ist-od6s", "success",
                    replacementRoll.total >= rollMessage.getFlag("nonex-ist-od6s", "difficulty"));
            }
            await rollMessage.setFlag("nonex-ist-od6s", "originalroll", rollMessage.rolls[0]);
            await rollMessage.update(rollMessageUpdate, {diff: true});
        } else {
            await OD6S.socket.executeAsGM("updateRollMessage", game.user.id, rollMessage.id, rollMessageUpdate);
        }
    }
}
