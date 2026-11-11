/**
 * Register active effect and manifestation event listeners on the actor sheet.
 */
export function registerEffectListeners(
    root: HTMLElement,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {

    // Update Effect
    root.querySelectorAll<HTMLElement>('.effect-edit').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const effect = sheet.document.effects.get(ct.dataset.effectId);
            await effect!.sheet.render(true);
        }));

    // Delete Effect
    root.querySelectorAll<HTMLElement>('.effect-delete').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const ok = await foundry.applications.api.DialogV2.confirm({
                window: {title: game.i18n.localize('NONEX_IST_OD6S.DELETE')},
                content: `<p>${game.i18n.localize('NONEX_IST_OD6S.CONFIRM_DELETE_EFFECT')}</p>`,
            });
            if (!ok) return;
            await sheet.document.deleteEmbeddedDocuments('ActiveEffect', [ct.dataset.effectId]);
        }));

    // Toggle Effect disabled state (enable / disable in place). Sheet
    // needs an explicit re-render so the toggle icon + disabled styling
    // reflect the new state without waiting for the next render trigger.
    root.querySelectorAll<HTMLElement>('.effect-toggle').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const effect = sheet.document.effects.get(ct.dataset.effectId);
            if (!effect) return;
            await effect.update({disabled: !effect.disabled});
            sheet.render();
        }));

    // Activate a manifestation
    root.querySelectorAll<HTMLElement>('.active-checkbox').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            const ct = ev.currentTarget as HTMLElement;
            const item = sheet.document.items.find((i: Item) => i.id === ct.dataset.itemId);

            if (item) {
                const itemSys = item.system as OD6SManifestationItemSystem;
                if (itemSys.attack) {
                    return;
                }

                const update: Record<string, unknown> = {
                    id: item.id,
                    'system.active': !itemSys.active,
                };

                await item.update(update);
                const actorEffectsList = sheet.document.getEmbeddedCollection('ActiveEffect');

                if (actorEffectsList.size > 0) {
                    const actorUpdate: Array<Record<string, unknown>> = [];
                    actorEffectsList.forEach((e: ActiveEffect) => {
                        const parts = e.origin?.split(".") ?? [];
                        const parentType = parts[0];
                        let documentType = parts[2];
                        let documentId = parts[3];
                        if (parentType === "Scene") {
                            documentType = parts[4];
                            documentId = parts[5];
                        }
                        if (documentType === "Item") {
                            const effectItem = sheet.document.items.find((i: Item) => i.id === documentId);
                            if (effectItem && effectItem.type === 'manifestation') {
                                const effSys = effectItem.system as OD6SManifestationItemSystem & { consumable?: boolean };
                                if (!effSys.consumable && e.disabled === effSys.active) {
                                    actorUpdate.push({
                                        _id: e.id,
                                        disabled: !itemSys.active,
                                    });
                                }
                            }
                        }
                    })
                    await sheet.document.updateEmbeddedDocuments('ActiveEffect', actorUpdate);
                }
            }
            sheet.render();
        }));
}
