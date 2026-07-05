import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import {isCharacterActor} from "../system/type-guards";
import { isOpposedQueueEmpty, pushOpposedQueue } from "../system/utilities/opposed";
import OD6SEditDifficulty from "../apps/edit-difficulty";
import {OD6SEditDamage} from "../apps/edit-damage";
import {OD6SChooseTarget} from "../apps/choose-target";
import {OD6SHandleWildDieForm} from "../apps/handle-wild-die";
import {error as logError} from "../system/logger";
import {MESSAGE_MODES} from "./chat-mode";

// Delegated event helper: attaches a listener on a parent that fires when a child matching selector is the target.
// Wraps the handler so async failures leave a `[nonex-ist-od6s:chat-log]` breadcrumb instead of unhandled rejections.
function delegateEvent(
    parent: HTMLElement,
    eventType: string,
    selector: string,
    handler: (ev: Event) => void | Promise<void>,
) {
    parent.addEventListener(eventType, (ev: Event) => {
        const target = (ev.target as Element | null)?.closest(selector);
        if (target && parent.contains(target)) {
            // Make ev.currentTarget behave like jQuery delegation
            Object.defineProperty(ev, 'currentTarget', { value: target, configurable: true });
            try {
                const result = handler(ev);
                if (result && typeof (result as Promise<void>).catch === 'function') {
                    (result as Promise<void>).catch(err =>
                        logError('chat-log', `${eventType} ${selector} handler failed`, err),
                    );
                }
            } catch (err) {
                logError('chat-log', `${eventType} ${selector} handler failed`, err);
            }
        }
    });
}

export function registerChatLogListeners() {
    Hooks.on('renderChatLog', (log, html, _data) => {
        // In v14, html is an HTMLElement, not jQuery

        delegateEvent(html, 'input', ".explosive-damage", async (ev: Event) => {
            const target = ev.currentTarget as HTMLElement;
            const input = ev.target as HTMLInputElement;
            const message = await game.messages.get(target.dataset.messageId!);
            const targets = message!.getFlag('nonex-ist-od6s', 'targets') as Record<string, { damage: string }>;
            targets[target.dataset.target!].damage = input.value;
            await message!.setFlag('nonex-ist-od6s', 'targets', targets);
        })

        // Keyboard activation for chat-card controls that aren't native <button>s
        // (header anchors without href, plus role="button" <div>/<span> nodes).
        // The selector mirrors the elements we make focusable via tabindex/role
        // in the chat templates.
        delegateEvent(
            html,
            "keydown",
            ".message-delete, .message-reveal, .message-oppose-button, " +
                ".modifiers-button, .damage-modifiers-button, " +
                ".edit-difficulty, .edit-damage, .choose-target",
            (ev: Event) => {
                const ke = ev as KeyboardEvent;
                if (ke.key === 'Enter' || ke.key === ' ') {
                    ev.preventDefault();
                    (ev.currentTarget as HTMLElement).click();
                }
            },
        )

        delegateEvent(html, "click", ".modifiers-button", async (ev: Event) => {
            const target = ev.currentTarget as HTMLElement;
            const content = document.getElementById("modifiers-display-" + target.dataset.messageId);
            if (content!.style.display === "block") {
                content!.style.display = "none";
            } else {
                content!.style.display = "block";
            }
            game!.messages.get(target.dataset.messageId!)?.render();
        })

        delegateEvent(html, "click", ".damage-modifiers-button", async (ev: Event) => {
            const target = ev.currentTarget as HTMLElement;
            const content = document.getElementById("damage-modifiers-display-" + target.dataset.messageId);
            if (content!.style.display === "block") {
                content!.style.display = "none";
            } else {
                content!.style.display = "block";
            }
            game!.messages.get(target.dataset.messageId!)?.render();
        })

        delegateEvent(html, "click", ".apply-damage-button", async (ev: Event) => {
            ev.preventDefault();
            const target = ev.currentTarget as HTMLElement;
            const token = game.scenes.active.tokens.get(target.dataset.tokenId!);
            let actor = token?.actor;
            if (!actor) return;
            const result = target.dataset.result!;
            const isVehicleData = target.dataset.isVehicle === 'true';
            const messageId = target.dataset.messageId!;
            const stun = target.dataset.stun;
            const msg = game.messages.get(messageId);
            const stunEffect = msg!.getFlag('nonex-ist-od6s', 'stunEffect');

            if (isCharacterActor(actor) && isVehicleData) {
                actor = await od6sutilities.getActorFromUuid(actor.system.vehicle.uuid);
            }
            if (!actor) return;

            if (od6sutilities.boolCheck(stun)) {
                if (stunEffect === 'unconscious') {
                    if (game.settings.get('nonex-ist-od6s', 'auto_status')) {
                        await actor.toggleStatusEffect('unconscious', {overlay: false, active: true});
                    }
                } else {
                    if (isCharacterActor(actor) && (stunEffect === '-1D' || stunEffect === '-2D')) {
                        const stunCurrent = stunEffect === '-1D' ? 1 : 2;
                        await actor.update({
                            'system.stuns.current': stunCurrent,
                            'system.stuns.rounds': 1,
                            'system.stuns.value': (+actor.system.stuns.value) + 1,
                        });
                    }
                    const stunnedName = game.i18n.localize(CONFIG!.statusEffects.find(e => e.id === 'stunned')!.name);
                    if (!actor.effects.contents.find((i: ActiveEffect) => i.name === stunnedName)) {
                        await actor.toggleStatusEffect('stunned', {overlay: false, active: true});
                    }
                }
            } else {
                const usesDamageLevels = game.settings.get('nonex-ist-od6s', 'bodypoints') === 0
                    || isVehicleData
                    || actor.type === 'starship' || actor.type === 'vehicle';
                if (usesDamageLevels) {
                    if (isVehicleData) {
                        await actor.applyDamage(result);
                    } else {
                        await actor.applyWounds(result);
                    }
                } else if (isCharacterActor(actor)) {
                    let bp = actor.system.wounds.body_points.current - Number(result);
                    if (bp < 0) bp = 0;
                    await actor.update({ 'system.wounds.body_points.current': bp });
                    if (game.settings.get('nonex-ist-od6s', 'bodypoints') === 1) await actor.setWoundLevelFromBodyPoints(bp);
                }
            }
            await msg!.setFlag('nonex-ist-od6s', 'applied', true);
        })

        delegateEvent(html, "click", ".explosive-damage-button", async (ev: Event) => {
            ev.preventDefault();
            const target = ev.currentTarget as HTMLElement;
            const { itemId, messageId, actorId, tokenId, templateId, stun } = target.dataset;
            if (!itemId) return;
            await od6sutilities.detonateExplosive({ itemId, messageId, actorId, tokenId, templateId, stun });
        })

        delegateEvent(html, 'click', '.remove-template-button', async (ev: Event) => {
            const target = ev.currentTarget as HTMLElement;
            const message = await game.messages.get(target.dataset.messageId!);
            const actor = message!.speaker.token === null
                ? game.actors.get(message!.speaker.actor)
                : game!.scenes.active.tokens.get(message!.speaker.token)?.actor;
            const item = actor!.items.get(message!.getFlag('nonex-ist-od6s', 'itemId') as string);
            const regionId = message!.getFlag('nonex-ist-od6s', 'template') as string | undefined;
            const region = regionId ? canvas.scene.getEmbeddedDocument('Region', regionId) : null;
            if (item && regionId) {
                await item.update({
                    [`flags.nonex-ist-od6s.explosivePending.-=${regionId}`]: null,
                });
            }
            if (region) await region.setFlag('nonex-ist-od6s', 'handled', true);
            await message!.setFlag('nonex-ist-od6s', 'handled', true);
            if (region) await canvas.scene.deleteEmbeddedDocuments('Region', [region.id]);
            await message!.setFlag('nonex-ist-od6s', 'applied', true);
        })

        delegateEvent(html, "click", ".damage-button", async (ev: Event) => {
            ev.preventDefault();
            const target = ev.currentTarget as HTMLElement;
            const data = target.dataset;
            const dice: { dice: number; pips: number } = {
                dice: Number(data.damageDice),
                pips: Number(data.damagePips),
            };
            let rollString;
            let itemId = '';

            if (typeof (data?.itemId) !== 'undefined' && data.itemId !== '') {
                itemId = data.itemId;
            }

            if (game.settings.get('nonex-ist-od6s', 'use_wild_die')) {
                dice.dice = dice.dice - 1;
                if (dice.dice < 1) {
                    rollString = "+1dw" + game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR");
                } else {
                    rollString = dice.dice + "d6" + game.i18n.localize('NONEX_IST_OD6S.BASE_DIE_FLAVOR') + "+1dw" +
                        game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR");
                }
            } else {
                rollString = dice.dice + "d6" + game.i18n.localize('NONEX_IST_OD6S.BASE_DIE_FLAVOR');
            }
            dice.pips ? rollString += "+" + dice.pips : null;
            if (!game.settings.get('nonex-ist-od6s', 'dice_for_scale')) {
                const scaleBonus = Number(data.damagescalebonus ?? 0);
                if (scaleBonus > 0) rollString += "+" + Math.abs(scaleBonus);
                if (scaleBonus < 0) rollString += "-" + Math.abs(scaleBonus);
            }

            const roll = await new Roll(rollString).evaluate();

            let label = game.i18n.localize('NONEX_IST_OD6S.DAMAGE') + " (" +
                game.i18n.localize(OD6S.damageTypes[data.damagetype ?? ""]) + ")";

            if (typeof (data.source) !== 'undefined' && data.source !== '') {
                label = label + " " + game.i18n.localize('NONEX_IST_OD6S.FROM') + " " +
                    game.i18n.localize(data.source);
            }

            if (typeof (data.vehicle) !== 'undefined' && data.vehicle !== '') {
                const vehicle = await od6sutilities.getActorFromUuid(data.vehicle);
                label = label + " " + game.i18n.localize('NONEX_IST_OD6S.BY') + " " + vehicle!.name;
            }

            if (typeof (data.targetname) !== 'undefined' && data.targetname !== '') {
                label = label + " " + game.i18n.localize('NONEX_IST_OD6S.TO') + " " + data.targetname;
            }

            const collisionFlag = data.collision === 'true';

            const flags = {
                "type": "damage",
                "source": data.source,
                "damageType": data.damagetype,
                "targetName": data.targetname,
                "targetId": data.targetid,
                "attackMessage": data.messageId,
                "isOpposable": true,
                "wild": false,
                "wildHandled": false,
                "wildResult": OD6S.wildDieResult[OD6S.wildDieOneDefault],
                "total": roll.total,
                "isVehicleCollision": collisionFlag,
                "stun": data.stun,
                "itemId": itemId
            }

            if (game.settings.get('nonex-ist-od6s', 'use_wild_die')) {
                const WildDie = roll.terms.find(d => game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR").includes(d.flavor))
                if (WildDie!.total === 1) {
                    flags.wild = true;
                    if (OD6S.wildDieOneDefault > 0 && OD6S.wildDieOneAuto === 0) {
                        flags.wildHandled = true;
                    }
                } else {
                    flags.wild = false;
                }
            }

            let messageMode: string = MESSAGE_MODES.PUBLIC;
            if (game.user.isGM && game.settings.get('nonex-ist-od6s', 'hide-gm-rolls')) messageMode = MESSAGE_MODES.GM;

            const rollMessage = await roll.toMessage({
                speaker: ChatMessage.getSpeaker({actor: game.actors.find(a => a.id === data.actor)}),
                flavor: label,
                flags: {
                    "nonex-ist-od6s": flags
                },
            }, {messageMode, create: true});

            if (flags.wild === true && OD6S.wildDieOneDefault === 2 && OD6S.wildDieOneAuto === 0) {
                const replacementRoll = JSON.parse(JSON.stringify(rollMessage.rolls[0].toJSON()));
                let highest = 0;
                for (let i = 0; i < replacementRoll.terms[0].results.length; i++) {
                    replacementRoll.terms[0].results[i].result >
                    replacementRoll.terms[0].results[highest].result ?
                        highest = i : {}
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
                    if (rollMessage.getFlag('nonex-ist-od6s', 'difficulty') && rollMessage.getFlag('nonex-ist-od6s', 'success')) {
                        replacementRoll.total < rollMessage.getFlag('nonex-ist-od6s', 'difficulty') ? await rollMessage.setFlag('nonex-ist-od6s', 'success', false) :
                            await rollMessage.setFlag('nonex-ist-od6s', 'success', true);
                    }
                    await rollMessage.setFlag('nonex-ist-od6s', 'originalroll', rollMessage.rolls[0])
                    await rollMessage.update(rollMessageUpdate, {"diff": true});
                } else {
                    await OD6S.socket.executeAsGM('updateRollMessage', game.user.id, rollMessage.id, rollMessageUpdate);
                }
            }
        })

        delegateEvent(html, "click", ".flavor-text", async (ev: Event) => {
            if (!game.user.isGM) return;
            const target = ev.currentTarget as HTMLElement;
            const message = game.messages.get(target.dataset.messageId!);
            let actor;
            if (message!.speaker.actor && message?.speaker.token) {
                actor = game.actors.tokens[message.speaker.token];
                if (typeof actor === "undefined") {
                    actor = game.actors.get(message.speaker.actor);
                }
            } else {
                actor = game.actors.get(message!.speaker.actor)
            }
            // Find the item
            const itemId = message!.getFlag('nonex-ist-od6s', 'itemId') as string;
            let item = actor?.items.find((i: Item) => i.id === itemId);
            if (typeof (item) === "undefined") {
                // See if the actor is a crewmember
                if (actor && isCharacterActor(actor) && typeof actor.system.vehicle.name !== 'undefined') {
                    const vehicleActor = await od6sutilities.getActorFromUuid(actor.system.vehicle.uuid);
                    item = vehicleActor!.items.find((i: Item) => i.id === itemId);
                }
            }
            if (typeof (item) === "undefined") return;
            item.sheet.render(true);
        })

        delegateEvent(html, "click", ".select-actor", async (ev: Event) => {
            if (!game.user.isGM) return;
            ev.preventDefault();
            const target = ev.currentTarget as HTMLElement;
            const message = game.messages.get(target.dataset.messageId!);
            let actor;
            if (message!.speaker.actor && message!.speaker.token) {
                actor = game.actors.tokens[message!.speaker.token];
            } else {
                actor = game.actors.get(message!.speaker.actor)
            }
            if (!actor) return;
            actor.sheet.render(true);
        })

        delegateEvent(html, "click", ".edit-difficulty", async (ev: Event) => {
            const target = ev.currentTarget as HTMLElement;
            const dataSet = target.dataset;
            const message = game.messages.get(dataSet.messageId!);
            const data = {
                messageId: dataSet.messageId,
                baseDifficulty: message!.getFlag('nonex-ist-od6s', 'baseDifficulty'),
                modifiers: message!.getFlag('nonex-ist-od6s', 'modifiers'),
            };
            new OD6SEditDifficulty(data).render(true);
        })

        delegateEvent(html, "click", ".edit-difficulty-submit", async (_ev: Event) => {
        })

        delegateEvent(html, "click", ".edit-damage", async (ev: Event) => {
            ev.preventDefault();
            const target = ev.currentTarget as HTMLElement;
            const dataSet = target.dataset;
            const message = game.messages.get(dataSet.messageId!);
            const data = {
                messageId: dataSet.messageId,
                damage: message!.getFlag('nonex-ist-od6s', 'damageScore'),
                damageDice: message!.getFlag('nonex-ist-od6s', 'damageDice'),
            };
            new OD6SEditDamage(data).render(true);
        })

        delegateEvent(html, "click", ".choose-target", async (ev: Event) => {
            ev.preventDefault();
            const target = ev.currentTarget as HTMLElement;
            const data: {
                targets: Array<{ id: string; name: string }> | unknown;
                messageId: string;
                isExplosive?: unknown;
            } = {
                targets: [],
                messageId: target.dataset.messageId!,
            };
            const message = game.messages.get(data.messageId);

            if (game.user.isGM) {
                data.isExplosive = message!.getFlag('nonex-ist-od6s', 'isExplosive');
                // If in combat, only load tokens in combat.  Otherwise, load all tokens in scene
                if (game.combat) {
                    const targets: Array<{ id: string; name: string }> = [];
                    for (const t of game.combat.combatants) {
                        targets.push({id: t.token.id, name: t.token.name});
                    }
                    data.targets = targets;
                } else {
                    data.targets = game.scenes.active.tokens;
                }
            } else {
                return;
            }
            new OD6SChooseTarget(data).render({force: true});
        })

        delegateEvent(html, "change", ".explosive-target-zone", async (ev: Event) => {
            const target = ev.currentTarget as HTMLElement;
            const input = ev.target as HTMLInputElement;
            const message = game.messages.get(target.dataset.messageId!);
            const targets = Array.from(message!.getFlag('nonex-ist-od6s', 'targets') as ArrayLike<{ id: string; zone?: number }>);
            for (const t in targets) {
                if (target.dataset.targetId === targets[t].id) {
                    targets[t].zone = parseInt(input.value);
                }
            }
            await message!.setFlag('nonex-ist-od6s', 'targets', targets);
        })

        delegateEvent(html, "click", ".message-sender", async (ev: Event) => {
            ev.preventDefault();
            const target = ev.currentTarget as HTMLElement;
            const message = await game.messages.get(target.dataset.messageId!);
            if (message!.speaker?.token !== null && message!.speaker?.token !== "") {
                const scene = game.scenes.get(message!.speaker.scene);
                const token = scene!.tokens.get(message!.speaker.token);
                if (typeof (token) !== "undefined" && typeof (token.actor) !== "undefined" && token.actor !== null) {
                    if (game.user.isGM || token.actor.isOwner) {
                        token.actor.sheet.render(true)
                    }
                }
            }
        })

        delegateEvent(html, "click", ".wilddiegm", async (ev: Event) => {
            ev.preventDefault();
            // three choices: leave it as-is, remove the highest die from the roll, or cause a complication
            new OD6SHandleWildDieForm(ev).render({force: true});
        })

        delegateEvent(html, "click", ".message-reveal", async (ev: Event) => {
            const target = ev.currentTarget as HTMLElement;
            const message = game.messages.get(target.dataset.messageId!);
            await message!.setFlag('nonex-ist-od6s', 'isVisible', true);
            await message!.setFlag('nonex-ist-od6s', 'isKnown', true);
            if (message!.getFlag('nonex-ist-od6s', 'isExplosive') && game.settings.get('nonex-ist-od6s', 'auto_explosive')) {
                // Reveal the explosive region
                const region = od6sutilities.getTemplateFromMessage(message!).template;
                if (region) {
                    await region.update({ visibility: 2 }); // Make visible to all
                }
            }
        })

        delegateEvent(html, "click", ".message-oppose", async (ev: Event) => {
            ev.preventDefault();
            // Check if there are any opposed cards already in the pipe
            const target = ev.currentTarget as HTMLElement;
            const data = {
                messageId: target.dataset.messageId!,
                target: target.dataset.target,
            };

            if (!isOpposedQueueEmpty()) {
                pushOpposedQueue(data);
                // @ts-expect-error - od6sutilities.handleOpposedRoll is added at runtime in od6s.ts
                return od6sutilities.handleOpposedRoll(data);
            } else {
                pushOpposedQueue(data);
            }
        })

        delegateEvent(html, "change", ".choose-difficulty", async (ev: Event) => {
            ev.preventDefault();
            const target = ev.currentTarget as HTMLSelectElement;
            const message = game.messages.get(target.dataset.messageId!);
            const flags: {
                difficultyLevel: string;
                difficulty: number;
                success?: boolean;
            } = {
                difficultyLevel: target.value,
                difficulty: await od6sutilities.getDifficultyFromLevel(target.value),
            };

            const update = {
                flags: { "nonex-ist-od6s": flags },
                id: message!.id,
                _id: message!.id,
            };

            const total = message!.getFlag('nonex-ist-od6s', 'total') as number | undefined;
            flags.success = !(typeof total === 'number' && total < flags.difficulty);

            if (message!.getFlag('nonex-ist-od6s', 'subtype') === 'purchase' && message!.getFlag('nonex-ist-od6s', 'success')) {
                const seller = game.actors.get(message!.getFlag('nonex-ist-od6s', 'seller') as string);
                await (seller!.sheet as unknown as {
                    _onPurchase: (item: unknown, actor: unknown) => Promise<void>
                })._onPurchase(message!.getFlag('nonex-ist-od6s', 'purchasedItem'), message!.speaker.actor);
            }

            await message!.update(update, {"diff": true});
        })
    })
}
