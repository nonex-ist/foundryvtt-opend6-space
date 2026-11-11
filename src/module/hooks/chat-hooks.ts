import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import { isOpposedQueueEmpty, setOpposedQueueEntry } from "../system/utilities/opposed";
import {promptResistanceRolls} from "../socketlib";
import {deriveRollMode} from "./chat-mode";
import {error as logError} from "../system/logger";
import {forcedDeletion} from "../system/forced-deletion";

function tagRollMode(msg: any, html: HTMLElement) {
    const mode = deriveRollMode(msg);
    html.classList.add(`nonex-ist-od6s-roll-${mode}`);
    if (!html.hasAttribute('role')) html.setAttribute('role', 'article');
    if (mode === 'public') return;

    const label = game.i18n.localize(`NONEX_IST_OD6S.ROLL_BADGE_${mode.toUpperCase()}`);
    const alias = (msg.alias ?? msg.speaker?.alias ?? '').trim();
    html.setAttribute('aria-label', alias ? `${label} — ${alias}` : label);

    const header = html.querySelector('.message-header');
    if (!header || header.querySelector('.nonex-ist-od6s-roll-badge')) return;

    const badge = document.createElement('span');
    badge.classList.add('nonex-ist-od6s-roll-badge', `nonex-ist-od6s-roll-badge--${mode}`);
    badge.textContent = label;

    const sender = header.querySelector('.message-sender');
    if (sender) sender.after(badge);
    else header.prepend(badge);
}

export function registerChatHooks() {
    Hooks.on('renderChatMessageHTML', (msg, html, data) => {
        tagRollMode(msg, html);

        if (game.settings.get('nonex-ist-od6s', 'hide-gm-rolls') && data.whisperTo !== '') {
            if (game.user.isGM === false &&
                game.userId !== data.author.id &&
                data.message.whisper.indexOf(game.user.id) === -1) {
                msg.sound = null;
                html.style.display = 'none';
            }
        }
    })

    Hooks.on("preDeleteChatMessage", async (message, _data, _diff, _id) => {
        try {
        if(message.getFlag('nonex-ist-od6s','isExplosive') && game.user.isGM) {
            // Delete the template and clear the flag from the item
            let actor;
            if (message.speaker.token !== null && message.speaker.token !== '') {
                actor = game.scenes.get(message.speaker.scene ?? '')?.tokens.get(message.speaker.token)?.actor
                    ?? game.actors.get(message.speaker.actor ?? '');
            } else {
                actor = game.actors.get(message.speaker.actor ?? '');
            }
            const item = actor?.items.find(i => i.id === message.getFlag('nonex-ist-od6s', 'itemId'));
            const regionId = message.getFlag('nonex-ist-od6s', 'template') as string | undefined;
            if (regionId) {
                const region = canvas.scene?.getEmbeddedDocument('Region', regionId);
                if (region) {
                    await canvas.scene!.deleteEmbeddedDocuments('Region', [regionId]);
                }
                if (item) {
                    await item.update({
                        [`flags.nonex-ist-od6s.explosivePending.${regionId}`]: forcedDeletion(),
                    });
                }
            } else if (item) {
                // Manual (non-auto) flow has no region. The dialog set
                // `explosiveSet=true` to gate the resolution roll; clear it
                // so a future throw reopens the placement dialog.
                await item.unsetFlag('nonex-ist-od6s', 'explosiveSet');
            }
            await od6sutilities.wait(100);
        }
        } catch (err) {
            logError('chat-hooks', 'preDeleteChatMessage failed', err);
        }
    })

    Hooks.on("updateChatMessage", async (message, data, _diff, _id) => {
        try {
        if (data.blind === false) {
            // Chat/messages may live in detached popout windows, so search every open app's element too.
            const sel = `.message[data-message-id="${data._id}"]`;
            const roots: ParentNode[] = [document];
            const apps = (foundry.applications as unknown as {
                instances: Map<string, { element?: HTMLElement }>
            }).instances;
            for (const app of apps.values()) {
                const el = app.element;
                if (el && !document.contains(el)) roots.push(el);
            }
            for (const root of roots) {
                root.querySelectorAll<HTMLElement>(sel).forEach(li => { li.style.display = ''; });
            }
        }

        if (message.getFlag('nonex-ist-od6s','isExplosive') && typeof(data.flags?.["nonex-ist-od6s"]?.success) !== 'undefined') {
            if(game.user.isGM) {
                let newTargets;

                    const messageData = od6sutilities.getTemplateFromMessage(message);
                    const actor = messageData.actor;
                    const item = messageData.item;
                    const template = messageData.template;

                    let updateTargets = false;

                    if (!data.flags["nonex-ist-od6s"].success && OD6S.autoExplosive) {
                        // Missed, scatter it
                        if (message.getFlag('nonex-ist-od6s', 'isExplosive') && item && template) {
                            const pending = (item.getFlag('nonex-ist-od6s', 'explosivePending') as
                                Record<string, { origin: { x: number; y: number } }> | undefined)?.[template.id];
                            // Origin can be absent on edit-after-execute because
                            // executeRollAction clears the pending entry once
                            // the attack message is created (pre-existing in
                            // the legacy scalar shape too). Skip scatter rather
                            // than throwing in `Ray(undefined, target)`.
                            if (pending?.origin) {
                                await od6sutilities.scatterExplosive(message.getFlag('nonex-ist-od6s', 'range'), pending.origin, template.id);
                                await od6sutilities.wait(100);
                                updateTargets = true;
                            }
                        }
                    }

                    if (data.flags["nonex-ist-od6s"].success && template) {
                        // Hit, un-scatter the region back to original position
                        const updatedShapes = foundry.utils.deepClone(template.shapes);
                        updatedShapes[0].x = template.getFlag('nonex-ist-od6s', 'originalX');
                        updatedShapes[0].y = template.getFlag('nonex-ist-od6s', 'originalY');
                        await template.update({ shapes: updatedShapes });
                        await od6sutilities.wait(100);
                        updateTargets = true;
                    }

                    if (updateTargets && actor) {
                        newTargets = await od6sutilities.getExplosiveTargets(actor, item!.id, template?.id);
                        if (Object.keys(newTargets).length === 0) {
                            await message.setFlag('nonex-ist-od6s','showButton', false);
                        } else {
                            await message.setFlag('nonex-ist-od6s','showButton',true);
                        }
                        await message.unsetFlag('nonex-ist-od6s','targets');
                        await message.setFlag('nonex-ist-od6s', 'targets', newTargets);
                    }

            }
        }

        await promptResistanceRolls(message);
        } catch (err) {
            logError('chat-hooks', 'updateChatMessage failed', err);
        }
    });

    Hooks.on('renderChatMessageHTML', (_message, _html, _data) => {
        ui.chat.scrollBottom();
    })

    Hooks.on('createChatMessage', async function (msg) {
        try {
        if (game.user.isGM) {
            if (msg.getFlag('nonex-ist-od6s', 'isOpposable') && OD6S.autoOpposed) {
                if ((msg.getFlag('nonex-ist-od6s', 'type') === 'damage') ||
                    msg.getFlag('nonex-ist-od6s', 'type') === 'resistance') {
                    await od6sutilities.waitFor3DDiceMessage(msg.id);
                    await od6sutilities.autoOpposeRoll(msg);
                } else if (msg.getFlag('nonex-ist-od6s', 'type') === 'explosive') {
                    const targets = msg.getFlag('nonex-ist-od6s', 'targets');
                    for (const target in targets) {
                        while (!isOpposedQueueEmpty()) {
                            // Loop until the previous message is handled
                            await new Promise(r => setTimeout(r, 100));
                        }
                        setOpposedQueueEntry(0, { messageId: msg.id });
                        const token = await game.scenes.active.tokens.get(targets[target].id);
                        if (typeof (token) !== 'undefined') {
                            await od6sutilities.generateOpposedRoll(token, msg);
                        }
                    }

                    // Delete the template and clear the flag from the item
                    let actor;
                    if (msg.speaker.token !== null && msg.speaker.token !== '') {
                        actor = game.scenes.get(msg.speaker.scene ?? '')?.tokens.get(msg.speaker.token)?.actor
                            ?? game.actors.get(msg.speaker.actor ?? '');
                    } else {
                        actor = game.actors.get(msg.speaker.actor ?? '');
                    }
                    const item = actor?.items.find(i => i.id === msg.getFlag('nonex-ist-od6s', 'item'));

                    const regionId = msg.getFlag('nonex-ist-od6s', 'template') as string | undefined;
                    if (item && regionId) {
                        await item.update({
                            [`flags.nonex-ist-od6s.explosivePending.${regionId}`]: forcedDeletion(),
                        });
                    }
                    await od6sutilities.wait(100);

                    const region = regionId ? canvas.scene?.getEmbeddedDocument('Region', regionId) : null;
                    if (region) {
                        await region.setFlag('nonex-ist-od6s', 'handled', true);
                        await canvas.scene!.deleteEmbeddedDocuments('Region', [region.id]);
                    }
                }

                let target;
                if (msg.getFlag('nonex-ist-od6s', 'target')) {
                    target = await od6sutilities.getActorFromUuid(msg.getFlag('nonex-ist-od6s', 'targetId'))
                }
                if (msg.getFlag('nonex-ist-od6s', 'isOpposable') && OD6S.autoOpposed && !target?.hasPlayerOwner
                    && (msg.getFlag('nonex-ist-od6s', 'type') === 'damage') || msg.getFlag('nonex-ist-od6s', 'type') === 'resistance') {
                    await od6sutilities.waitFor3DDiceMessage(msg.id);
                    await od6sutilities.autoOpposeRoll(msg);
                }
            }
        }

        await promptResistanceRolls(msg);
        } catch (err) {
            logError('chat-hooks', 'createChatMessage failed', err);
        }
    })
}
