import {OD6SAddCrew} from "../add-crew";
import {OD6SAddEmbeddedCrew} from "../add-embedded-crew";
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

/**
 * Register vehicle-related event listeners on the actor sheet.
 */
export function registerVehicleListeners(
    root: HTMLElement,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {

    // Embedded Pilot
    root.querySelectorAll<HTMLElement>('.embedded-pilot-add').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            const data: Record<string, unknown> = {};
            data.targets = game.collections.get('Actor').filter((a: Actor) => a.type === 'npc' && !a.isToken);
            data.actor = sheet.document.uuid;
            await new OD6SAddEmbeddedCrew(data).render({force: true});
        }));

    root.querySelectorAll<HTMLElement>('.embedded-pilot-remove').forEach((elem) =>
        elem.addEventListener('click', async () => {
            const ok = await foundry.applications.api.DialogV2.confirm({
                window: {title: game.i18n.localize('NONEX_IST_OD6S.DELETE')},
                content: `<p>${game.i18n.localize('NONEX_IST_OD6S.CONFIRM_REMOVE_EMBEDDED_PILOT')}</p>`,
            });
            if (!ok) return;
            // Remove skills/specs from the base actor.
            // `skills`/`specializations` are sheet-prepared item buckets, not on the Actor type.
            const doc = sheet.document as Actor & {skills: Item[]; specializations: Item[]};
            let removeSkills = doc.skills.map((i: Item) => i._id);
            removeSkills = removeSkills.concat(doc.specializations.map((i: Item) => i._id));
            if (removeSkills.length > 0) {
                await sheet.document.deleteEmbeddedDocuments('Item', removeSkills);
            }

            //zero out attributes
            const update: Record<string, unknown> = {};
            for (const a in sheet.document.system.attributes) {
                update[`system.attributes.${a}.base`] = 0;
                update[`system.embedded_pilot.actor`] = "";
            }
            await sheet.document.update(update);
            sheet.render();
        }));

    // Force-exit from vehicle
    root.querySelectorAll<HTMLElement>('.vehicle-exit').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            await sheet.document.setFlag('nonex-ist-od6s', 'crew', '');
        }));

    // Open a crewmember's character sheet
    root.querySelectorAll<HTMLElement>('.crew-member').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const actor = await od6sutilities.getActorFromUuid(ct.dataset.uuid!);
            if (!actor) {
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.ACTOR_NOT_FOUND'));
                return;
            }
            if (actor.testUserPermission(game.user, "OWNER")) {
                actor.sheet.render(true);
            } else {
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_NOT_CREW_OWNER'));
            }
        }));

    // Add/remove crew to vehicles
    root.querySelectorAll<HTMLElement>('.crew-add').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            const data: Record<string, unknown> = {};
            data.crew = [];
            if (!game.scenes.active) {
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_NO_ACTIVE_SCENE'));
                return;
            }
            let tokens: TokenDocument[] = game.scenes.active.tokens.filter(
                (t: TokenDocument) => t.actor != null,
            );

            if (tokens.length === 0) {
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.NO_TOKENS'));
                return;
            }

            // Filter out tokens who are a vehicle
            tokens = tokens.filter((t: TokenDocument) => t.actor!.type !== "vehicle" && t.actor.type !== "starship");

            if (game.user.isGM) {
                // Filter out tokens who are already crew members in a vehicle
                tokens = tokens.filter((t: TokenDocument) => !t.actor!.isCrewMember());
            } else {
                // If a player, filter out hostile/neutral tokens
                tokens = tokens.filter((t: TokenDocument) => t.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY);

                // Filter out already-crewed tokens
                const crewed: TokenDocument[] = [];
                for (let i = 0; i < tokens.length; i++) {
                    if (await OD6S.socket.executeAsGM("checkCrewStatus", tokens[i].actor.uuid)) {
                        crewed.push(tokens[i]);
                    }
                }

                tokens = tokens.filter((e: TokenDocument) => !crewed.includes(e));
            }

            if (tokens.length === 0) {
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.NO_TOKENS'));
                return;
            }

            data.targets = tokens;
            data.actor = sheet.document.uuid;
            data.type = sheet.document.type;
            new OD6SAddCrew(data).render(true);
        }));

    root.querySelectorAll<HTMLElement>('.crew-delete').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            const ct = ev.currentTarget as HTMLElement;
            if (!game.user.isGM && sheet.document.uuid === ct.dataset.crewid) {
                return await OD6S.socket.executeAsGM('unlinkCrew', game.user.id, ct.dataset.crewid, ct.dataset.vehicleid);
            } else if (game.user.isGM && sheet.document.uuid === ct.dataset.crewid) {
                const vehicle = await od6sutilities.getActorFromUuid(ct.dataset.vehicleid!)
                await vehicle!.sheet.unlinkCrew(sheet.document.uuid);
            } else {
                return await sheet.unlinkCrew(ct.dataset.crewid);
            }
        }));

    // Vehicle shield allocation
    root.querySelectorAll<HTMLElement>('.arc').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const arc = ct.dataset.arc!;
            const direction = ct.dataset.direction;
            const value = sheet.document.system.shields.value;
            let allocated = sheet.document.system.shields.allocated;
            let newValue = sheet.document.system.shields.arcs[arc].value;
            let doUpdate = false;

            if (direction === "up") {
                if (allocated < value) {
                    newValue++;
                    allocated++;
                    doUpdate = true;
                }
            } else {
                if (sheet.document.system.shields.arcs[arc].value > 0) {
                    newValue--;
                    allocated > 0 ? allocated-- : ui.notifications.error(game.i18n.localize('NONEX_IST_OD6S.ALLOCATION_ERROR'));
                    doUpdate = true;
                }
            }

            if (doUpdate) {
                const update = {
                    _id: sheet.document.id,
                    id: sheet.document.id,
                    system: {
                        shields: {
                            allocated,
                            arcs: {[arc]: {value: newValue}},
                        },
                    },
                };

                await sheet.document.update(update, {diff: true});
            }
        }));

    // Vehicle shield allocation by crew member
    root.querySelectorAll<HTMLElement>('.c-arc').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const actor = await od6sutilities.getActorFromUuid(ct.dataset.uuid!);
            const arc = ct.dataset.arc!;
            const direction = ct.dataset.direction;
            const value = sheet.document.system.vehicle.shields.value;
            let allocated = sheet.document.system.vehicle.shields.allocated;
            let newValue = sheet.document.system.vehicle.shields.arcs[arc].value;
            let doUpdate = false;

            if (direction === "up") {
                if (allocated < value) {
                    newValue++;
                    allocated++;
                    doUpdate = true;
                }
            } else {
                if (sheet.document.system.vehicle.shields.arcs[arc].value > 0) {
                    newValue--;
                    allocated > 0 ? allocated-- : ui.notifications.error(game.i18n.localize('NONEX_IST_OD6S.ALLOCATION_ERROR'));
                    doUpdate = true;
                }
            }

            if (doUpdate) {
                const update: Record<string, unknown> = {
                    system: {
                        shields: {
                            allocated,
                            arcs: {[arc]: {value: newValue}},
                        },
                    },
                };
                if (game.user.isGM) {
                    await actor!.update(update, {diff: true});
                } else {
                    update.uuid = ct.dataset.uuid;
                    sheet.document.modifyShields(update)
                }
            }
        }));
}
