import OD6S from "../../config/config-od6s";
import {isSkillItem} from "../../system/type-guards";

/**
 * Minimal sheet shape consumed by these helpers — avoids the actor-sheet ↔
 * helpers cycle that would result from importing `OD6SActorSheet` here.
 */
interface ItemCrudSheetLike {
    document: Actor;
    render: (force?: boolean) => unknown;
}

/**
 * Delete an item from the actor, with confirmation dialog.
 */
export async function deleteItem(sheet: ItemCrudSheetLike, ev: Event) {
    const ct = ev.currentTarget as HTMLElement;
    // If this is a skill, deny if there are existing specializations.
    if (ct.dataset.type === "skill") {
        const skillId = ct.dataset.itemId;
        const skillItem = skillId ? sheet.document.items.get(skillId) as Item | undefined : undefined;
        if (skillItem) {
            for (const docItem of sheet.document.items as Iterable<Item & { system?: { skill?: string } }>) {
                if (docItem.type === "specialization" && docItem.system?.skill === skillItem.name) {
                    ui.notifications.error(game.i18n.localize("NONEX_IST_OD6S.ERR_SKILL_HAS_SPEC"));
                    return;
                }
            }
        }
    }
    if (ct.dataset.confirm !== "false") {
        let itemId;
        if (typeof ct.dataset.itemId !== 'undefined' && ct.dataset.itemId !== '') {
            itemId = ct.dataset.itemId;
        } else {
            const li = ct.closest<HTMLElement>(".item");
            itemId = li?.dataset.itemId;
        }
        const itemName = (itemId ? sheet.document.items.get(itemId)?.name : undefined) ?? "";
        // V1 Dialog.prompt rendered with the unstyled grey template; use
        // DialogV2.confirm for the same yes/no shape with the V2 styling.
        const ok = await foundry.applications.api.DialogV2.confirm({
            window: {title: game.i18n.localize("NONEX_IST_OD6S.DELETE")},
            content: `<p>${game.i18n.format("NONEX_IST_OD6S.DELETE_CONFIRM_NAMED", {
                name: foundry.utils.escapeHTML(itemName),
            })}</p>`,
        });
        if (!ok) return;
        if (itemId) await sheet.document.deleteEmbeddedDocuments('Item', [itemId]);
        sheet.render(false);
    } else {
        if (ct.dataset.itemId) await sheet.document.deleteEmbeddedDocuments('Item', [ct.dataset.itemId]);
        sheet.render(false);
    }
}

/**
 * Add an item to the actor using the add-item dialog.
 */
export async function addItem(
    sheet: ItemCrudSheetLike,
    ev: Event,
    caller?: unknown,
) {
    // Lazy-import to avoid circular dependency
    const {OD6SAddItem} = await import("../add-item.js");
    const {od6sutilities} = await import("../../system/utilities.js");

    caller = caller ?? sheet;
    const ct = ev.currentTarget as HTMLElement;
    // Templates also pass `'spec'` as a shorthand alongside the real OD6S
    // item types, so widen the literal here.
    const itemType = ct.dataset.type! as OD6SItemType | 'spec';
    const data: Record<string, unknown> = {};
    data.type = itemType;
    data.attrname = ct.dataset.attrname;
    data.new = !(typeof ct.dataset.new !== 'undefined' && ct.dataset.new === 'false');
    let worldItems: Item[] = [];
    let compendiumItems: Item[] = [];

    const typeLabel = game.i18n.localize(OD6S.itemLabels[itemType]);
    data.label = game.i18n.format('NONEX_IST_OD6S.ADD_ITEM_TYPE', {type: typeLabel});
    data.label_empty = game.i18n.format('NONEX_IST_OD6S.ADD_EMPTY_ITEM_TYPE', {type: typeLabel});

    worldItems = game.items.filter((i: Item) => i.type === itemType);
    const cEntries = od6sutilities.getItemsFromCompendiumByType(itemType as OD6SItemType);

    if (itemType === 'skill') {
        worldItems = worldItems.filter((i: Item) => isSkillItem(i) && i.system.attribute === data.attrname);
        for (const i of cEntries) {
            const item = await od6sutilities._getItemFromCompendium((i as Item).name);
            if (item && isSkillItem(item) && item.system.attribute === data.attrname) {
                compendiumItems.push(item);
            }
        }
    } else {
        for (const i of cEntries) {
            const item = await od6sutilities._getItemFromCompendium((i as Item).name);
            if (item) compendiumItems.push(item);
        }
    }

    //if it is a skill, do not include skills the actor already has
    if (itemType === 'skill') {
        worldItems = worldItems.filter((i: Item) => !sheet.document.items.find((r: Item) => r.name === i.name));
        compendiumItems = compendiumItems.filter((i: Item) => !sheet.document.items.find((r: Item) => r.name === i.name));
    }

    // Prefer world items
    compendiumItems = compendiumItems.filter((i: Item) => !worldItems.find((r: Item) => r.name === i.name));

    data.items = [...worldItems, ...compendiumItems].sort((a: Item, b: Item) => {
        const x = a.name.toUpperCase();
        const y = b.name.toUpperCase();
        return x === y ? 0 : x > y ? 1 : -1;
    })

    data.serializeditems = JSON.stringify(data.items);
    data.actor = sheet.document.id;
    data.token = sheet.document.isToken === true ? sheet.document.token._id : '';
    data.actorType = sheet.document.type;

    if (itemType === 'skill' || itemType === 'spec') {
        if (itemType === 'skill' && data.attrname === 'met' && game.settings.get('nonex-ist-od6s', 'metaphysics_attribute_optional')) {
            // No metaphysics attribute, set skill to default of 1D
            data.score = OD6S.pipsPerDice;
        } else {
            const attrs = (sheet.document.system as OD6SCharacterSystem).attributes;
            data.score = attrs[data.attrname as string].base;
        }
    } else {
        data.score = 0;
    }
    data.caller = caller;
    await new OD6SAddItem(data).render(true);
}

/**
 * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset.
 */
export function onItemCreate(sheet: ItemCrudSheetLike, event: Event) {
    event.preventDefault();
    const header = event.currentTarget as HTMLElement;
    // Get the type of item to create.
    const type = header.dataset.type!;
    // String.prototype.capitalize is provided by Foundry at runtime.
    const capType = (type as string & {capitalize?: () => string}).capitalize?.() ?? type;

    // Grab any data associated with this control.
    const data = foundry.utils.deepClone(header.dataset);
    // Initialize a default name.
    const name = game.i18n.format('NONEX_IST_OD6S.NEW_ITEM_TYPE', {type: game.i18n.localize('ITEM.Type' + capType)});
    // Prepare the item object.
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete data["type"];
    // v14 documents take initial values under `system` (V1 used `data`).
    const itemData: { name: string; type: string; system: Record<string, string | undefined> } = {
        name,
        type,
        system: data,
    };

    // Finally, create the item!
    return sheet.document.createEmbeddedDocuments("Item", [itemData]);
}
