import OD6SItemInfo from "../../apps/item-info";
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

/**
 * Register inventory-related event listeners on the actor sheet.
 */
export function registerInventoryListeners(
    root: HTMLElement,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {

    // Edit item quantity
    root.querySelectorAll<HTMLElement>('.edit-quantity').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const item = sheet.document.items.get(ct.dataset.itemId);
            await item!.update({
                'system.quantity': (ev.target as HTMLInputElement).value,
            });
        }));

    // Use a consumable
    root.querySelectorAll<HTMLElement>('.use-consumable').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const item = sheet.document.items.get(ct.dataset.itemId);
            const itemSys = item!.system as OD6SEquipment;
            await item!.update({
                id: item!._id,
                'system.quantity': itemSys.quantity - 1,
            });

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
                        if (effectItem && e.disabled === true) {
                            actorUpdate.push({_id: e.id, disabled: false});
                        }
                    }
                })
                await sheet.document.updateEmbeddedDocuments('ActiveEffect', actorUpdate);
            }
        }));

    // Equip an item
    root.querySelectorAll<HTMLElement>('.equip-checkbox').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const item = sheet.document.items.find((i: Item) => i.id === ct.dataset.itemId);

            if (item) {
                const itemSys = item.system as OD6SEquip;
                await item.update({
                    id: item.id,
                    'system.equipped.value': !itemSys.equipped.value,
                });
                const actorEffectsList = sheet.document.getEmbeddedCollection('ActiveEffect');

                if (actorEffectsList.size > 0) {
                    const actorUpdate: Array<Record<string, unknown>> = [];
                    const itemUpdates: Array<Record<string, unknown>> = [];
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
                            if (!effectItem || !OD6S.equippable.includes(effectItem.type)) return;
                            const effSys = effectItem.system as OD6SEquip & {consumable?: boolean};
                            if (effSys.consumable || e.disabled !== effSys.equipped.value) return;
                            if (!effSys.equipped.value) {
                                for (const c of e.system.changes) {
                                    if (c.key.startsWith('system.items.skills') && c.type === "add") {
                                        const t = c.key.split('.');
                                        const foundItem = sheet.document.items.find((i: Item) => i.name === t[3]);
                                        itemUpdates.push({
                                            id: foundItem!.id,
                                            system: {mod: 0},
                                        });
                                    }
                                }
                            }
                            actorUpdate.push({
                                _id: e.id,
                                disabled: !itemSys.equipped.value,
                            });
                        }
                    })
                    await sheet.document.updateEmbeddedDocuments('ActiveEffect', actorUpdate);
                    for (const u of itemUpdates) {
                        const a = sheet.document.items.find((i: Item) => i.id === u.id);
                        await a!.update(u);
                    }
                }
            }
            sheet.render();
        }));

    // Update Inventory Item
    root.querySelectorAll<HTMLElement>('.item-edit').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            let itemId;
            if (typeof ct.dataset.itemId !== 'undefined' && ct.dataset.itemId !== '') {
                itemId = ct.dataset.itemId;
            } else {
                const li = ct.closest<HTMLElement>(".item");
                itemId = li?.dataset.itemId;
            }
            const item = sheet.document.items.get(itemId);
            item!.sheet.render(true);
        }));

    // Delete Inventory Item
    root.querySelectorAll<HTMLElement>('.item-delete').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            await sheet.deleteItem(ev);
        }));

    // Add Inventory Item
    root.querySelectorAll<HTMLElement>('.item-create').forEach((elem) =>
        elem.addEventListener('click', sheet._onItemCreate.bind(sheet)));
    root.querySelectorAll<HTMLElement>('.cargo-hold-add').forEach((elem) =>
        elem.addEventListener('click', sheet.document.onCargoHoldItemCreate.bind(sheet.document)));

    // Add Item to actor using a button
    root.querySelectorAll<HTMLElement>('.item-add').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            await sheet.addItem(ev);
        }));

    // Show item details
    root.querySelectorAll<HTMLElement>('.show-item-details').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            const ct = ev.currentTarget as HTMLElement;
            let item = game.actors.get(ct.dataset.actorId!)?.items.get(ct.dataset.itemId!);
            if (typeof item !== 'undefined') {
                new OD6SItemInfo(item).render(true);
            } else {
                const itemName = ct.dataset.itemName!;
                item = await od6sutilities._getItemFromWorld(itemName);
                if (item) {
                    new OD6SItemInfo(item).render(true);
                } else {
                    // Check compendia
                    const compItem = await od6sutilities._getItemFromCompendium(itemName);
                    if (compItem) {
                        new OD6SItemInfo(compItem).render(true);
                    }
                }
            }
        }));

    // Purchase click event
    root.querySelectorAll<HTMLElement>('.item-purchase').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            if (!game.user.character) {
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_NO_CHARACTER_ASSIGNED'));
                return;
            }
            const ct = ev.currentTarget as HTMLElement;
            if (OD6S.cost === '0') {
                await sheet.rollPurchase(ev, game.user.character!.id);
            } else {
                await sheet._onPurchase(ct.dataset.itemId, game.user.character!.id);
            }
        }));

    // Transfer click event
    root.querySelectorAll<HTMLElement>('.item-transfer').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            if (!game.user.character) {
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_NO_CHARACTER_ASSIGNED'));
                return;
            }
            const ct = ev.currentTarget as HTMLElement;
            await sheet._onTransfer(ct.dataset.itemId, ct.dataset.senderId, ct.dataset.recId);
        }));

    // Merchant owner edit quantity
    root.querySelectorAll<HTMLElement>('.merchant-quantity-owner').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const item = sheet.document.items.get(ct.dataset.itemId);
            await sheet.document.updateEmbeddedDocuments('Item', [{
                _id: item!.id,
                system: {quantity: (ev.target as HTMLInputElement).value},
            }]);
        }));

    // Merchant owner edit cost
    root.querySelectorAll<HTMLElement>('.merchant-cost-owner').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const item = sheet.document.items.get(ct.dataset.itemId);
            await sheet.document.updateEmbeddedDocuments('Item', [{
                _id: item!.id,
                system: {cost: (ev.target as HTMLInputElement).value},
            }]);
        }));

    // Merchant owner edit price
    root.querySelectorAll<HTMLElement>('.merchant-price-owner').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const item = sheet.document.items.get(ct.dataset.itemId);
            await sheet.document.updateEmbeddedDocuments('Item', [{
                _id: item!.id,
                system: {price: (ev.target as HTMLInputElement).value},
            }]);
        }));
}
