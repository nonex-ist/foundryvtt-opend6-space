/**
 * Minimal sheet shape used by these sort helpers — keeps them decoupled
 * from `OD6SActorSheet` to avoid circular imports.
 */
interface ActorSheetLike {
    document: Actor;
}

/** Drop payload accumulated by Foundry's drag-drop pipeline. */
type SortDropData = { _id: string; [key: string]: unknown };

/** Subset of the crew-drop payload we actually read here. */
interface CrewSortData { crewUuid: string }

/**
 * Sort items within the actor sheet.
 */
export function onSortItem(sheet: ActorSheetLike, event: DragEvent, itemData: SortDropData) {
    // Get the drag source and drop target
    const items = sheet.document.items;
    const source = items.get(itemData._id);
    const dropTarget = (event.target as HTMLElement | null)?.closest("li[data-item-id]") as
        HTMLElement | null;
    if (!dropTarget) return;
    const target = items.get(dropTarget.dataset.itemId!);

    // Don't sort on yourself
    if (source!.id === target!.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings: Item[] = [];
    for (const el of dropTarget.parentElement!.children as HTMLCollectionOf<HTMLElement>) {
        const siblingId = el.dataset.itemId;
        if (!siblingId || siblingId === source!.id) continue;
        const sib = items.get(siblingId);
        if (sib) siblings.push(sib);
    }

    // Perform the sort
    const sortUpdates = foundry.utils.performIntegerSort(source, {target, siblings});
    const updateData = sortUpdates.map((u) => {
        const update = u.update;
        update._id = u.target!._id;
        return update;
    });

    // Perform the update
    return sheet.document.updateEmbeddedDocuments("Item", updateData);
}

/**
 * Sort crew members within the vehicle sheet.
 */
export async function onSortCrew(sheet: ActorSheetLike, event: DragEvent, data: CrewSortData) {
    type CrewMember = { uuid: string; sort?: number };
    const crewMembers = [...(sheet.document.system as { crewmembers: CrewMember[] }).crewmembers];
    const source = crewMembers.filter((c) => c.uuid === data.crewUuid)[0];
    const dropTarget = (event.target as HTMLElement | null)?.closest("li[data-crew-uuid]") as
        HTMLElement | null;
    if (!dropTarget) return;
    const target = crewMembers.filter((c) => c.uuid === dropTarget.dataset.crewUuid)[0];

    // Identify sibling items based on adjacent HTML elements
    const siblings: CrewMember[] = [];
    for (const el of dropTarget.parentElement!.children as HTMLCollectionOf<HTMLElement>) {
        const siblingId = el.dataset.crewUuid;
        if (siblingId && (siblingId !== source.uuid)) {
            siblings.push(crewMembers.filter((c) => c.uuid === siblingId)[0]);
        }
    }

    const sortUpdates = foundry.utils.performIntegerSort(source, {target, siblings});

    const updateData = sortUpdates.map((u) => {
        const update = u.update;
        update.uuid = (u.target as {uuid: string}).uuid;
        return update;
    });

    for (let i = 0; i < updateData.length; i++) {
        for (let j = 0; j < crewMembers.length; j++) {
            if (updateData[i].uuid === crewMembers[j].uuid) {
                crewMembers[j].sort = (+updateData[i].sort)
            }
        }
    }

    crewMembers.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

    const updateObject = {
        system: {
            crewmembers: crewMembers
        }
    }

    await sheet.document.update(updateObject);
}

/**
 * Sort cargo items within a vehicle/starship.
 */
export async function onSortCargoItem(sheet: ActorSheetLike, event: DragEvent, itemData: SortDropData) {
    // Get the drag source and its siblings
    const source = sheet.document.items.get(itemData._id);
    const siblings = sheet.document.items.filter((i: Item) => {
        return (i._id !== source!._id);
    });

    // Get the drop target
    const dropTarget = (event.target as HTMLElement | null)?.closest("[data-item-id]") as
        HTMLElement | null;
    const targetId = dropTarget ? dropTarget.dataset.itemId : null;
    const target = siblings.find((s: Item) => s._id === targetId);

    // Perform the sort
    const sortUpdates = foundry.utils.performIntegerSort(source, {target: target, siblings});
    const updateData = sortUpdates.map((u) => {
        const update = u.update;
        update._id = u.target!._id;
        return update;
    });

    // Perform the update
    return await sheet.document.updateEmbeddedDocuments("Item", updateData);
}

/**
 * Sort items within a container.
 */
export async function onSortContainerItem(sheet: ActorSheetLike, event: DragEvent, itemData: SortDropData) {
    // Get the drag source and its siblings
    const source = sheet.document.items.get(itemData._id);
    const siblings = sheet.document.items.filter((i: Item) => {
        return (i.type === source!.type) && (i._id !== source!._id);
    });

    // Get the drop target
    const dropTarget = (event.target as HTMLElement | null)?.closest("[data-item-id]") as
        HTMLElement | null;
    const targetId = dropTarget ? dropTarget.dataset.itemId : null;
    const target = siblings.find((s: Item) => s._id === targetId);

    // Ensure we are only sorting like-types
    if (target && (source!.type !== target.type)) return;

    // Perform the sort
    const sortUpdates = foundry.utils.performIntegerSort(source, {target: target, siblings});
    const updateData = sortUpdates.map((u) => {
        const update = u.update;
        update._id = u.target!._id;
        return update;
    });

    // Perform the update
    await sheet.document.updateEmbeddedDocuments("Item", updateData);
}
