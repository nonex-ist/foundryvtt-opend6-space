import OD6S from "../config/config-od6s";
import {od6sutilities} from "../system/utilities";
import {SpecializeDialog} from "./specialize-dialog";

/**
 * Shape of the specialization payload built by `_onSpecialize` and consumed
 * by both the dialog template and `addSpecialization`. Mutated in place by
 * dialog change handlers.
 */
export interface SpecializeData {
    specname: string;
    type: "specialization";
    skill: string;
    attribute: string;
    description: string;
    score: number;
    cpcost: number;
    originalcpcost: number;
    actor: Actor;
    freeadvance: boolean;
    dice: number;
    pips: number;
    time?: string;
}

/** Sheet shape consumed here — bound at click time via `.bind(sheet)`. */
interface SpecializeSheetLike {
    actor: Actor;
    render: () => unknown;
}

export class od6sspecialize {


    async _onSpecialize(this: SpecializeSheetLike, event: Event) {
        event.preventDefault();
        // Create the specialization item, tied to the correct attribute/skill
        const target = event.currentTarget as HTMLElement;
        const skill = this.actor.getEmbeddedDocument("Item",
            target.dataset.itemId!, true) as
            (Item & {system: {score: number; attribute: string; description: string}});
        const attrs = (this.actor.system as OD6SCharacterSystem).attributes;
        const derivedScore = (+skill.system.score)
            + (+attrs[skill.system.attribute.toLowerCase()]!.score) + 1;
        const cpCost = Math.floor(Math.floor(derivedScore / OD6S.pipsPerDice) / 2);
        const newItemData: SpecializeData = {
            specname: "",
            type: "specialization",
            skill: skill.name,
            attribute: skill.system.attribute,
            description: skill.system.description,
            score: derivedScore,
            cpcost: cpCost,
            originalcpcost: cpCost,
            actor: this.actor,
            freeadvance: false,
            dice: od6sutilities.getDiceFromScore(derivedScore - 1).dice,
            pips: od6sutilities.getDiceFromScore(derivedScore - 1).pips,
        };

        new SpecializeDialog(
            newItemData,
            () => od6sspecialize.addSpecialization(this, newItemData, skill.id!),
        ).render({force: true});

    }

    static async addSpecialization(
        actorSheet: SpecializeSheetLike,
        itemData: SpecializeData,
        skillId: string,
        _dice?: unknown,
        _pips?: unknown,
    ) {
        // Can't have a blank name
        if (typeof(itemData.specname)==='undefined' || itemData.specname==="" ) {
            ui.notifications.error(game.i18n.localize("NONEX_IST_OD6S.ERR_SPECIALIZATION_NAME"));
            return;
        }

        // Can't spend what you don't have
        if (actorSheet.actor.type === "character") {
            const charSystem = actorSheet.actor.system as OD6SCharacterSystem;
            if ((+itemData.cpcost) > (+charSystem.characterpoints.value) &&
                charSystem.sheetmode.value !== "freeedit") {
                ui.notifications.warn(game.i18n.localize("NONEX_IST_OD6S.NOT_ENOUGH_CP_SPEC"));
                return;
            }
        }

        // Create new specialization item, derived from original skill
        const baseSkill = foundry.utils.deepClone(actorSheet.actor.getEmbeddedDocument("Item",
            skillId, true)) as { system: { base: number } };
        let base;
        if(actorSheet.actor.type === "npc") {
            // Get the score from the form
            const itemActorAttrs = (itemData.actor.system as OD6SCharacterSystem).attributes;
            base = (+od6sutilities.getScoreFromDice(itemData.dice, itemData.pips)) -
                itemActorAttrs[itemData.attribute]!.base;
        } else {
            base = (+baseSkill.system.base) + 1;
        }

        const newItemData = {
            name: itemData.specname,
            type: itemData.type,
            system: {
                attribute: itemData.attribute,
                description: itemData.specname,
                base: base,
                time: itemData.time,
                skill: itemData.skill,
            },
        };

        await actorSheet.actor.createEmbeddedDocuments('Item', [newItemData]);

        // Deduct character points
        if (actorSheet.actor.type === "character") {
            const charSystem = actorSheet.actor.system as OD6SCharacterSystem;
            if ((+itemData.cpcost) > 0 && charSystem.sheetmode.value !== "freeedit") {
                // The legacy expression here was `update.system.characterpoints.value -=
                // actor.system.characterpoints.value`, which compounded an undefined
                // LHS with a numeric RHS and persisted NaN. Charge the actual cpcost
                // against current CP — the surrounding guard already ensures it fits.
                const update: { id: string | null; system: { characterpoints: { value: number } } } = {
                    id: actorSheet.actor.id,
                    system: {
                        characterpoints: {
                            value: charSystem.characterpoints.value - (+itemData.cpcost),
                        },
                    },
                };
                await actorSheet.actor.update(update, {diff: true});
            }
        }

        actorSheet.render();
    }
}
