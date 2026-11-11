import {forcedDeletion} from "../../system/forced-deletion";
/**
 * Sheet helpers for the freeform `system.labels` map on items.
 * Extracted from item-sheet.ts; behaviour preserved.
 */

const {DialogV2} = foundry.applications.api;

export async function addLabel(item: Item): Promise<void> {
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/nonex-ist-od6s/templates/item/item-add-label.html",
        {id: item.id});
    const result = await DialogV2.input({
        window: {title: game.i18n.localize("NONEX_IST_OD6S.ADD") + " " + game.i18n.localize("NONEX_IST_OD6S.LABEL") + "!"},
        content,
        ok: {label: game.i18n.localize("NONEX_IST_OD6S.ADD")},
    });
    if (result?.key) await addLabelAction(item, result.key, result.value);
}

export async function addLabelAction(item: Item, key: string, value: string): Promise<void> {
    if (item.system.labels[key]) {
        ui.notifications.warn(game.i18n.localize("NONEX_IST_OD6S.LABEL_ALREADY_EXISTS"));
        return;
    }
    await item.update({id: item.id, [`system.labels.${key}`]: value});
}

export async function editLabel(item: Item, ev: Event): Promise<void> {
    const target = ev.currentTarget as HTMLElement;
    const input = ev.target as HTMLInputElement;
    await item.update({
        id: item.id,
        [`system.labels.${target.dataset.key}`]: input.value,
    });
}

export async function deleteLabel(item: Item, ev: Event): Promise<void> {
    const target = ev.currentTarget as HTMLElement;
    await item.update({
        id: item.id,
        system: item.system,
        [`system.labels.${target.dataset.key}`]: forcedDeletion(),
    });
}
