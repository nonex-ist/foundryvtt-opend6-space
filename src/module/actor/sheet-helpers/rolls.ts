/**
 * Roll dispatchers for the actor sheet. Each function takes the sheet
 * (instead of being a method on it) so the sheet class can stay focused
 * on Foundry's V2 lifecycle while these stay testable in isolation.
 *
 * Three of the four funnel into `od6sroll._onRollDialog` — assembling its
 * input from the triggering DOM event plus the actor's current state.
 * Two exceptions worth noting:
 *   - `rollAvailableAction` short-circuits via `item.roll(...)` when the
 *     dataset row references a real owned item, never reaching the dialog
 *     helper directly (the item path itself opens the dialog further down).
 *   - `rollBodyPoints` posts a vanilla Foundry `Roll` straight to chat —
 *     it's a one-shot strength-die roll that updates the actor's body-
 *     points cap, not a player roll that needs the modifier dialog.
 */

import {od6sroll} from "../../apps/roll";
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import type {IncomingRollData} from "../../apps/roll-helpers/roll-data";
import {MESSAGE_MODES} from "../../hooks/chat-mode";

/**
 * Minimal sheet shape consumed by these helpers. Matches the pattern in
 * `templates.ts` / `drops.ts` to avoid the actor-sheet ↔ helpers cycle.
 */
interface RollSheetLike {
    document: Actor;
    /** Linked token for token-bound sheets; undefined for actor-directory sheets. */
    token?: TokenDocument | null;
}

export async function rollAvailableVehicleAction(sheet: RollSheetLike, ev: Event): Promise<void> {
    const target = ev.currentTarget as HTMLElement;
    const data = target.dataset;
    const actorData = sheet.document.system as OD6SCharacterSystem;

    if (data.rollable !== "true") return;

    const rollData: Partial<IncomingRollData> = {score: 0, scale: 0};

    if (["vehicleramattack", "vehiclemaneuver", "vehicledodge"].includes(data.type!)) {
        rollData.score = od6sutilities.getScoreFromSkill(sheet.document,
                actorData.vehicle.specialization!.value,
                actorData.vehicle.skill!.value, OD6S.vehicle_actions[data.id!].base)
            + actorData.vehicle.maneuverability!.score;
    } else if (data.type === "vehiclesensors") {
        rollData.score = +(od6sutilities.getScoreFromSkill(sheet.document, "",
            (actorData.vehicle.sensors as Record<string, string>).skill,
            OD6S.vehicle_actions[data.id!].base)) + (+data.score!);
    } else if (data.type === "vehicleshields") {
        rollData.score = od6sutilities.getScoreFromSkill(sheet.document, "",
            game.i18n.localize((actorData.vehicle.shields as Record<string, string>).skill),
            OD6S.vehicle_actions[data.id!].base);
    } else {
        const item = actorData.vehicle.vehicle_weapons?.find(
            (i: VehicleWeaponSnapshot) => i.id === data.id);
        if (item !== null && typeof item !== "undefined") {
            rollData.score = od6sutilities.getScoreFromSkill(sheet.document, item.system.specialization.value,
                game.i18n.localize(item.system.skill.value), item.system.attribute.value);
            rollData.score += item.system.fire_control.score;
            rollData.scale = item.system.scale.score;
            rollData.damage = item.system.damage.score;
            rollData.damage_type = item.system.damage.type;
        }
    }

    if (!rollData.scale) rollData.scale = actorData.vehicle.scale!.score;
    rollData.name = game.i18n.localize(data.name!);
    rollData.type = "action";
    rollData.actor = sheet.document;
    rollData.subtype = data.type;
    await od6sroll._onRollDialog(rollData as IncomingRollData);
}

export async function rollAvailableAction(sheet: RollSheetLike, ev: Event): Promise<void> {
    const target = ev.currentTarget as HTMLElement;
    const data = target.dataset;
    const rollData: Partial<IncomingRollData> = {token: sheet.token?.id};
    let name = game.i18n.localize(data.name!);
    let flatPips = 0;

    if (data.rollable !== "true") return;
    if (data.id !== "") {
        const item = sheet.document.items.find((i: Item) => i.id === data.id);
        if (item !== null && typeof item !== "undefined") {
            await (item as Item & {roll: (parry: boolean) => Promise<unknown>})
                .roll(data.type === "parry");
            return;
        }
    }

    if (["dodge", "parry", "block"].includes(data.type!)) {
        switch (data.type) {
            case "dodge": name = OD6S.actions.dodge.skill; break;
            case "parry": name = OD6S.actions.parry.skill; break;
            case "block": name = OD6S.actions.block.skill; break;
        }
        name = game.i18n.localize(name);
    }

    type SkillLike = Item & {system: {attribute: string; score: number}};
    const actorSystem = sheet.document.system as OD6SCharacterSystem;
    if (data.type === "attribute") {
        name = data.name!;
        rollData.attribute = data.id;
    } else {
        const ownedSkill = sheet.document.items.find(
            (i: Item) => i.type === "skill" && i.name === name) as SkillLike | undefined;
        if (ownedSkill !== null && typeof ownedSkill !== "undefined") {
            const attrKey = ownedSkill.system.attribute.toLowerCase();
            if (OD6S.flatSkills) {
                rollData.score = (+actorSystem.attributes[attrKey].score);
                flatPips = (+ownedSkill.system.score);
            } else {
                rollData.score = (+ownedSkill.system.score)
                    + (+actorSystem.attributes[attrKey].score);
            }
        } else {
            const worldSkill = (await od6sutilities._getItemFromWorld(name)) as SkillLike | null | undefined;
            if (worldSkill !== null && typeof worldSkill !== "undefined") {
                rollData.score = (+actorSystem.attributes[worldSkill.system.attribute.toLowerCase()].score);
            } else {
                const compSkill = (await od6sutilities._getItemFromCompendium(name)) as SkillLike | null | undefined;
                if (compSkill !== null && typeof compSkill !== "undefined") {
                    rollData.score = (+actorSystem.attributes[compSkill.system.attribute.toLowerCase()].score);
                } else {
                    for (const a in OD6S.actions) {
                        if (OD6S.actions[a].type === data.type) {
                            rollData.score = (+actorSystem.attributes[OD6S.actions[a].base].score);
                            break;
                        }
                    }
                }
            }
        }
    }

    if (flatPips > 0) rollData.flatpips = flatPips;
    rollData.name = name;
    rollData.type = "action";
    rollData.actor = sheet.document;
    rollData.subtype = data.type;
    await od6sroll._onRollDialog(rollData as IncomingRollData);
}

/**
 * Roll the strength dice plus the bodyPoints +20 base, hide for GMs when
 * configured, and stash the result on `system.wounds.body_points.max`.
 * Wild-die handling matches the legacy implementation: 1dw if str < 2,
 * else (str-1)d6+1dw — when the wild-die setting is on.
 */
export async function rollBodyPoints(sheet: RollSheetLike): Promise<void> {
    const actorSystem = sheet.document.system as OD6SCharacterSystem;
    const strDice = od6sutilities.getDiceFromScore(actorSystem.attributes.str.score
        + actorSystem.attributes.str.mod);
    let rollString;
    if (game.settings.get("nonex-ist-od6s", "use_wild_die")) {
        if (strDice.dice < 2) rollString = "1dw";
        else rollString = (+strDice.dice - 1) + "d6+1dw";
    } else {
        rollString = strDice.dice + "d6";
    }
    rollString += "+" + (+strDice.pips + 20);

    const label = game.i18n.localize("NONEX_IST_OD6S.ROLLING") + " " + game.i18n.localize(OD6S.bodyPointsName);

    let messageMode: string = MESSAGE_MODES.PUBLIC;
    if (game.user.isGM && game.settings.get("nonex-ist-od6s", "hide-gm-rolls")) {
        messageMode = MESSAGE_MODES.GM;
    }
    const roll = await new Roll(rollString).evaluate();
    await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: label,
    }, {messageMode, create: true});

    await sheet.document.update({"system.wounds.body_points.max": roll.total});
}

export async function rollPurchase(sheet: RollSheetLike, ev: Event, buyerId: string): Promise<void> {
    const target = ev.currentTarget as HTMLElement;
    const item = sheet.document.items.get(target.dataset.itemId!);
    if (typeof item === "undefined") {
        ui.notifications.warn(game.i18n.localize("NONEX_IST_OD6S.ITEM_NOT_FOUND"));
        return;
    }
    const buyer = game.actors.get(buyerId);
    const itemSystem = item.system as OD6SEquipment;
    const data: Partial<IncomingRollData> = {
        name: game.i18n.localize("NONEX_IST_OD6S.PURCHASE") + " " + item.name,
        itemId: item.id ?? undefined,
        actor: buyer,
        seller: sheet.document.id ?? undefined,
        type: "purchase",
        difficultyLevel: OD6S.difficultyShort[itemSystem.price as unknown as string],
    };
    data.score = (buyer!.system as OD6SCharacterSystem).funds.score;
    await od6sroll._onRollDialog(data as IncomingRollData);
}
