import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {isVehicleActor} from "../../system/type-guards";
import {MESSAGE_MODES} from "../../hooks/chat-mode";
import {
    isCrewMemberByFlag,
    canRemoveFromCrew,
    removeCrewmember,
    buildVehicleWeaponSnapshots,
    shouldDispatchVehicleDataAsGM,
    selectCrewmembersForBroadcast,
} from "./crew-vehicle-math";

export async function addEmbeddedPilot(actor: Actor, pilotActor: Actor): Promise<void> {
    /* Copy attributes and items to vehicle */
    await actor.createEmbeddedDocuments('Item',
        pilotActor.items.filter((s: Item) => s.type === 'skill' || s.type === "specialization"));
    const update: Record<string, unknown> = {
        "system.attributes": (pilotActor.system as { attributes: unknown }).attributes,
        "system.embedded_pilot.actor": pilotActor,
    };
    await actor.update(update);
}

export async function addToCrew(actor: Actor, vehicleId: string): Promise<unknown> {
    if (actor.isCrewMember()) {
        const currentVehicle = await fromUuid(await actor.getFlag('nonex-ist-od6s', 'crew'));
        const newVehicle = await fromUuid(vehicleId);

        const data = {
            "vehicleId": vehicleId,
            "currentVehicleName": currentVehicle.name,
            "newVehicleName": newVehicle.name
        };

        const addTemplate = "systems/nonex-ist-od6s/templates/actor/common/verify-new-crew.html";
        const html = await foundry.applications.handlebars.renderTemplate(addTemplate, data);
        const label = game.i18n.localize("NONEX_IST_OD6S.TRANSFER_VEHICLE");

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: label },
            content: html,
            yes: { label: game.i18n.localize("NONEX_IST_OD6S.OK") },
        });
        if (confirmed) await actor._verifyAddToCrew(currentVehicle.uuid, vehicleId);
        return undefined;
    } else {
        return await actor.setFlag('nonex-ist-od6s', 'crew', vehicleId);
    }
}

export async function _verifyAddToCrew(actor: Actor, currentVehicleId: string, newVehicleId: string): Promise<void> {
    const oldVehicle = await fromUuid(currentVehicleId);
    let oldActor;
    if (oldVehicle.documentName === "Token") {
        oldActor = oldVehicle.actor;
    } else {
        oldActor = oldVehicle;
    }
    await oldActor.sheet.unlinkCrew(actor.uuid);

    const newVehicle = await fromUuid(newVehicleId);
    let newActor;
    if (newVehicle.documentName === "Token") {
        newActor = newVehicle.actor;
    } else {
        newActor = newVehicle;
    }

    await newActor.sheet.linkCrew(actor.uuid);
}

export async function removeFromCrew(actor: Actor, vehicleID: string): Promise<void> {
    if (!canRemoveFromCrew(actor.getFlag('nonex-ist-od6s', 'crew') as string | null | undefined, vehicleID)) {
        ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.NOT_CREW_MEMBER'))
        return;
    }
    try {
        await actor.unsetFlag('nonex-ist-od6s', 'crew');
    } catch (error) {
        console.error(error)
    }
}

export async function forceRemoveCrewmember(actor: Actor, crewID: string): Promise<void> {
    if (!isVehicleActor(actor)) return;
    const crewMembers = removeCrewmember(actor.system.crewmembers, crewID);
    await actor.update({system: {crewmembers: crewMembers}});
}

export function isCrewMember(actor: Actor): boolean {
    return isCrewMemberByFlag(actor.getFlag('nonex-ist-od6s', 'crew') as string | null | undefined);
}

export async function sendVehicleData(actor: Actor, uuid?: string): Promise<void> {
    if (!isVehicleActor(actor)) return;
    const sys = actor.system;
    const data: Record<string, unknown> = {
        uuid: actor.uuid,
        name: actor.name,
        type: actor.type,
        move: sys.move,
        maneuverability: sys.maneuverability,
        toughness: sys.toughness,
        crewmembers: sys.crewmembers,
        items: actor.items,
        attribute: sys.attribute,
        skill: sys.skill,
        specialization: sys.specialization,
        damage: sys.damage,
        shields: sys.shields,
        scale: sys.scale,
        sensors: (sys as unknown as { sensors: unknown }).sensors,
        armor: sys.armor,
        dodge: sys.dodge,
        ranged: sys.ranged,
        ranged_damage: sys.ranged_damage,
        ram: sys.ram,
        ram_damage: sys.ram_damage,
        vehicle_weapons: buildVehicleWeaponSnapshots(actor.items.contents),
    };

    if (shouldDispatchVehicleDataAsGM(game.user.isGM)) {
        await OD6S.socket.executeAsGM("sendVehicleData", game.user.id, data);
        return;
    }
    const crew = selectCrewmembersForBroadcast(
        data.crewmembers as Array<{ uuid: string }>, uuid);
    // Batch world-actor updates through Actor.updateDocuments to cut socket
    // chatter and avoid partial-failure half-states. Token-actor (synthetic)
    // updates fall back to the per-doc path because they live on a scene's
    // token collection, not in `game.actors`.
    const worldUpdates: Array<Record<string, unknown>> = [];
    for (const e of crew) {
        const crewActor = await od6sutilities.getActorFromUuid(e.uuid);
        if (!crewActor) continue;
        if (crewActor.isToken) {
            await crewActor.update({_id: crewActor.id, system: {vehicle: data}});
        } else {
            worldUpdates.push({_id: crewActor.id, system: {vehicle: data}});
        }
    }
    if (worldUpdates.length > 0) {
        await Actor.updateDocuments(worldUpdates);
    }
}

export async function modifyShields(actor: Actor, update: Record<string, unknown>): Promise<void> {
    await OD6S.socket.executeAsGM("modifyShields", game.user.id, update);
}

export async function vehicleCollision(actor: Actor): Promise<void> {
    if (actor.type !== 'vehicle' && actor.type !== 'starship') {
        ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_ACTOR_NOT_VEHICLE'));
        return;
    }
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/nonex-ist-od6s/templates/actor/vehicle/collision.html");
    const result = await foundry.applications.api.DialogV2.input({
        window: {title: game.i18n.localize("NONEX_IST_OD6S.ROLL_COLLISION_DAMAGE")},
        content,
        ok: {label: game.i18n.localize("NONEX_IST_OD6S.ROLL")},
    });
    if (!result) return;

    await rollVehicleCollision(actor, result);
}

async function rollVehicleCollision(
    actor: Actor,
    result: { vehiclespeed: string; vehiclecollisiontype: string; vehiclecollisionmod?: string | number },
): Promise<void> {
    const speed = result.vehiclespeed;
    const speedValue = OD6S.vehicle_speeds[speed].damage;
    const type = result.vehiclecollisiontype;
    const typeValue = OD6S.collision_types[type].score;
    const mod = result.vehiclecollisionmod ?? 0;
    const score = (+speedValue) + (+typeValue) + (+mod * OD6S.pipsPerDice);
    const dice = od6sutilities.getDiceFromScore(score);
    let rollString;
    if (game.settings.get("nonex-ist-od6s", "use_wild_die")) {
        dice.dice = dice.dice - 1;
        if (dice.dice < 1) {
            rollString = "+1dw" + game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR");
        } else {
            rollString = dice.dice + "d6" + game.i18n.localize("NONEX_IST_OD6S.BASE_DIE_FLAVOR") + "+1dw"
                + game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR");
        }
    } else {
        rollString = dice.dice + "d6" + game.i18n.localize("NONEX_IST_OD6S.BASE_DIE_FLAVOR");
    }
    if (dice.pips) rollString += "+" + dice.pips;

    const roll = await new Roll(rollString).evaluate();
    const label = game.i18n.localize("NONEX_IST_OD6S.DAMAGE") + " ("
        + game.i18n.localize(OD6S.damageTypes["p"]) + ") "
        + game.i18n.localize("NONEX_IST_OD6S.FROM") + " " + game.i18n.localize("NONEX_IST_OD6S.COLLISION");

    const flags: {
        type: string; source: string; damageType: string;
        targetName: string | null; targetId: string | null;
        isOpposable: boolean; wild: boolean; wildHandled: boolean;
        wildResult: unknown; total: number; isVehicleCollision: boolean;
    } = {
        type: "damage",
        source: game.i18n.localize("NONEX_IST_OD6S.COLLISION"),
        damageType: "p",
        targetName: null,
        targetId: null,
        isOpposable: true,
        wild: false,
        wildHandled: false,
        wildResult: OD6S.wildDieResult[OD6S.wildDieOneDefault],
        total: roll.total,
        isVehicleCollision: true,
    };

    if (game.settings.get("nonex-ist-od6s", "use_wild_die")) {
        const wildFlavor = game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR").replace(/[[\]]/g, "");
        const wildTerm = (roll.terms as Array<{ flavor: string; total: number }>)
            .find((d) => d.flavor === wildFlavor);
        if (wildTerm?.total === 1) {
            flags.wild = true;
            if (OD6S.wildDieOneDefault > 0 && OD6S.wildDieOneAuto === 0) flags.wildHandled = true;
        }
    }

    let messageMode: string = MESSAGE_MODES.PUBLIC;
    if (game.user.isGM && game.settings.get("nonex-ist-od6s", "hide-gm-rolls")) {
        messageMode = MESSAGE_MODES.GM;
    }

    const rollMessage = await roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: game.actors.find((a: Actor) => a.id === actor.id)}),
        flavor: label,
        flags: {"nonex-ist-od6s": flags},
    }, {messageMode, create: true});

    if (flags.wild === true && OD6S.wildDieOneDefault === 2 && OD6S.wildDieOneAuto === 0) {
        type DieResult = { result: number; discarded?: boolean; active?: boolean };
        type RollSnapshot = {
            total: number;
            terms: Array<{ results: DieResult[] }>;
        };
        const replacementRoll = JSON.parse(JSON.stringify(rollMessage.rolls[0].toJSON())) as RollSnapshot;
        let highest = 0;
        for (let i = 0; i < replacementRoll.terms[0].results.length; i++) {
            if (replacementRoll.terms[0].results[i].result > replacementRoll.terms[0].results[highest].result) {
                highest = i;
            }
        }
        replacementRoll.terms[0].results[highest].discarded = true;
        replacementRoll.terms[0].results[highest].active = false;
        replacementRoll.total -= (+replacementRoll.terms[0].results[highest].result) + 1;
        (flags as { total: number }).total = replacementRoll.total;

        if (rollMessage.getFlag("nonex-ist-od6s", "difficulty") && rollMessage.getFlag("nonex-ist-od6s", "success")) {
            await rollMessage.setFlag("nonex-ist-od6s", "success",
                replacementRoll.total >= (rollMessage.getFlag("nonex-ist-od6s", "difficulty") as number));
        }

        await rollMessage.setFlag("nonex-ist-od6s", "originalroll", rollMessage.rolls?.[0]);
        await rollMessage.update({
            id: rollMessage.id,
            _id: rollMessage._id,
            content: replacementRoll.total,
            roll: replacementRoll,
            system: {},
        }, {diff: true});
    }
}

export async function onCargoHoldItemCreate(actor: Actor, event: Event): Promise<unknown> {
    event.preventDefault();

    const documentName = 'Item';
    let types = game.documentTypes[documentName].filter(t => t !== CONST.BASE_DOCUMENT_TYPE);
    const data: Record<string, unknown> = {};
    const foldersCollection = game.folders.filter(f => (f.type === documentName) && f.displayed);
    const folders = foldersCollection.map(f => ({id: f.id, name: f.name}));
    const label = game.i18n.localize('NONEX_IST_OD6S.ITEM');
    const title = game.i18n.format("NONEX_IST_OD6S.CREATE_ITEM", {entity: label});
    const template = 'templates/sidebar/document-create.html';

    if (game.settings.get('nonex-ist-od6s', 'hide_advantages_disadvantages')) {
        types = types.filter(function (value, _index, _arr) {
            return value !== 'advantage';
        })
        types = types.filter(function (value, _index, _arr) {
            return value !== 'disadvantage';
        })
    }

    types = types.filter(t => OD6S.cargo_hold.includes(t));
    types = types.filter(t => !t.startsWith(actor.type));

    types = types.sort(function (a, b) {
        return a.localeCompare(b);
    })

    // Render the entity creation form. The V1 globals (renderTemplate,
    // Dialog, FormDataExtended) are deprecated in v13+ and produce the
    // unstyled grey/white-text dialog reported in #64; route through
    // the V2 namespaces instead.
    const html = await foundry.applications.handlebars.renderTemplate(template, {
        name: data.name || game.i18n.format("NONEX_IST_OD6S.NEW_ITEM", {entity: label}),
        folder: data.folder,
        folders: folders,
        hasFolders: folders.length > 0,
        type: data.type || types[0],
        types: types.reduce<Record<string, string>>((obj, t) => {
            const label = CONFIG[documentName]?.typeLabels?.[t] ?? t;
            obj[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
            return obj;
        }, {}),
        hasTypes: types.length > 1
    });

    // DialogV2.input parses the rendered <form>'s named inputs into an
    // object on submit, and returns null on cancel.
    const result = await foundry.applications.api.DialogV2.input({
        window: {title},
        content: html,
        ok: {label: title},
    });
    if (!result) return undefined;

    foundry.utils.mergeObject(data, result);
    if (!data.folder) delete data["folder"];
    if (types.length === 1) data.type = types[0];
    data.name = data.name
        || game.i18n.localize('NONEX_IST_OD6S.NEW') + " " + game.i18n.localize(OD6S.itemLabels[data.type as string]);
    return actor.createEmbeddedDocuments('Item', [data]);
}
