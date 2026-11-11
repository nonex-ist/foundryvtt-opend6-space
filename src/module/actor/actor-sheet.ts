 
import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import OD6SCreateCharacter from "../apps/character-creation";

// Listener modules
import {registerInventoryListeners} from "./sheet-listeners/inventory";
import {registerCombatActionListeners, registerCombatRollListeners} from "./sheet-listeners/combat-actions";
import {registerVehicleListeners} from "./sheet-listeners/vehicle";
import {registerScoreListeners, registerRollListeners} from "./sheet-listeners/scores";
import {registerEffectListeners} from "./sheet-listeners/effects";
import {registerDragListeners} from "./sheet-listeners/drag";

// Helper modules
import {bindPrimaryTabs} from "../system/utilities/bind-tabs";
import {isCharacterActor} from "../system/type-guards";
import {deleteItem, addItem, onItemCreate} from "./sheet-helpers/item-crud";
import {
    onDropCharacterTemplate, onDropSpeciesTemplate, onDropItemGroup,
    addCharacterTemplate, templateItems,
    onClearCharacterTemplate, onClearSpeciesTemplate,
} from "./sheet-helpers/templates";
import {onDrop, onDropItem, onDropActor} from "./sheet-helpers/drops";
import {onSortItem, onSortCrew, onSortCargoItem, onSortContainerItem} from "./sheet-helpers/sorting";
import {
    prepareCharacterItems, prepareVehicleItems,
    prepareStarshipItems, prepareContainerItems,
} from "./sheet-helpers/prepare-items";
import {
    rollAvailableAction, rollAvailableVehicleAction,
    rollBodyPoints, rollPurchase as rollPurchaseHelper,
} from "./sheet-helpers/rolls";
import {onPurchase, onTransfer} from "./sheet-helpers/inventory-transfer";
import {linkCrew, unlinkCrew} from "./sheet-helpers/crew";


const {HandlebarsApplicationMixin, DialogV2} = foundry.applications.api;
const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;

/** Attribute row shape rendered by the actor-sheet template's attribute grid. */
type ActorSheetAttributeRow = OD6SAttributeField & { id: string; sort: number; active: boolean };

/** Render-context shape produced by `_prepareContext` and consumed by `actor-sheet.html`. */
interface ActorSheetContext {
    actor: Actor;
    document: Actor;
    /** Container actors are not in `Actor.system`'s union by design, so widen here. */
    system: OD6SCharacterSystem | OD6SVehicleSystem | OD6SContainerSystem;
    items: Item[];
    dtypes: string[];
    editable: boolean;
    owner: boolean;
    cssClass: string;
    /** Sorted attribute rows; absent on container actors. */
    attrs?: ActorSheetAttributeRow[];
}

/**
 * OD6S actor sheet — ApplicationV2 + HandlebarsApplicationMixin.
 * Single template (`actor-sheet.html`) handles all actor types via internal branching.
 */
export class OD6SActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["nonex-ist-od6s", "sheet", "actor"],
        position: {width: 915, height: 800},
        window: {resizable: true, minimizable: true},
        form: {submitOnChange: true, closeOnSubmit: false},
        actions: {},
    };

    static PARTS = {
        body: {template: "systems/nonex-ist-od6s/templates/actor/common/actor-sheet.html"},
    };

    async _prepareContext(_options?: object): Promise<ActorSheetContext> {
        const actor = this.actor;
        const context: ActorSheetContext = {
            actor,
            document: actor,
            system: actor.system as ActorSheetContext["system"],
            items: actor.items.contents,
            dtypes: ["String", "Number", "Boolean"],
            editable: this.isEditable,
            owner: actor.isOwner,
            cssClass: this.isEditable ? "editable" : "locked",
        };

        if (actor.type === "character" || actor.type === "npc" || actor.type === "creature") {
            Object.assign(actor, prepareCharacterItems(context.items));
        } else if (actor.type === "vehicle") {
            Object.assign(actor, prepareVehicleItems(context.items, OD6S.cargo_hold));
        } else if (actor.type === "starship") {
            Object.assign(actor, prepareStarshipItems(context.items, OD6S.cargo_hold));
        } else if (actor.type === "container" && actor.isOwner) {
            Object.assign(actor, prepareContainerItems(context.items));
        }

        context.items = context.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

        if (actor.type !== "container") {
            const attributes: ActorSheetAttributeRow[] = [];
            for (const i in OD6S.attributes) {
                const entry = (actor.system as OD6SCharacterSystem | OD6SVehicleSystem)
                    .attributes[i] as ActorSheetAttributeRow;
                entry.id = i;
                entry.sort = OD6S.attributes[i].sort;
                entry.active = OD6S.attributes[i].active;
                attributes.push(entry);
            }
            context.attrs = attributes.sort((a, b) => a.sort - b.sort);
        }

        return context;
    }

    /* -------------------------------------------- */
    /*  Render & Event Listeners                     */
    /* -------------------------------------------- */

    async _onRender(context: object, options: object): Promise<void> {
        await super._onRender(context, options);

        const root = this.element as HTMLElement;

        bindPrimaryTabs(this, root);

        // Roll triggers and effect management (edit/delete/toggle) are bound
        // for any owner, independent of `isEditable` (which in v14 is derived
        // purely from update permission; there is no PLAY/EDIT sheet mode).
        // See issues #76 and #165.
        if (this.actor.isOwner) {
            registerRollListeners(root, this);
            registerCombatRollListeners(root, this);
            registerEffectListeners(root, this);
        }

        if (!this.isEditable) return;

        root.querySelectorAll(".alpha-item-sort-button").forEach((elem) =>
            elem.addEventListener("click", async () => {
                await this._alphaSortAllItems();
                await this.render();
            }));

        root.querySelectorAll(".track_stuns_counter").forEach((elem) =>
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                const ok = await foundry.applications.api.DialogV2.confirm({
                    window: {title: game.i18n.localize("NONEX_IST_OD6S.RESET")},
                    content: `<p>${game.i18n.localize("NONEX_IST_OD6S.CONFIRM_RESET_STUNS")}</p>`,
                });
                if (!ok) return;
                await this.document.update({system: {stuns: {value: 0}}});
                await this.render();
            }));

        root.querySelectorAll(".create-character").forEach((elem) =>
            elem.addEventListener("click", async () => {
                if (!isCharacterActor(this.document)) return;
                const newChar = new OD6SCreateCharacter(this.document,
                    od6sutilities.getAllItemsByType("character-template"));
                newChar.render({force: true});
                await this.close();
            }));

        root.querySelectorAll(".reset-template").forEach((elem) =>
            elem.addEventListener("click", async () => {
                const ok = await DialogV2.confirm({
                    window: {title: game.i18n.localize("NONEX_IST_OD6S.CLEAR_TEMPLATE")},
                    content: `<p>${game.i18n.localize("NONEX_IST_OD6S.CONFIRM_TEMPLATE_CLEAR")}</p>`,
                });
                if (ok) await this._onClearCharacterTemplate();
            }));

        root.querySelectorAll(".reset-species-template").forEach((elem) =>
            elem.addEventListener("click", async () => {
                const ok = await DialogV2.confirm({
                    window: {title: game.i18n.localize("NONEX_IST_OD6S.CLEAR_SPECIES_TEMPLATE")},
                    content: `<p>${game.i18n.localize("NONEX_IST_OD6S.CONFIRM_SPECIES_TEMPLATE_CLEAR")}</p>`,
                });
                if (ok) await this._onClearSpeciesTemplate();
            }));

        registerInventoryListeners(root, this);
        registerCombatActionListeners(root, this);
        registerVehicleListeners(root, this);
        registerScoreListeners(root, this);
        registerDragListeners(root, this);
    }

    _sortItems(items: Item[], sortType: string): Item[] {
        if (sortType === "alpha") return items.sort((a, b) => a.name.localeCompare(b.name));
        return items;
    }

    _resetSortToAlpha(items: Item[]): Item[] {
        items = items.sort((a, b) => a.name.localeCompare(b.name));
        let sortNumber = 1000;
        for (const i of items) {
            i.sort = sortNumber;
            sortNumber = sortNumber + 500;
        }
        return items;
    }

    async _alphaSortAllItems() {
        const items = this._resetSortToAlpha(this.document.items.contents);
        const updates = items.map((i) => ({_id: i.id, sort: i.sort}));
        await this.document.updateEmbeddedDocuments("Item", updates);
    }

    /* -------------------------------------------- */
    /*  Item CRUD Methods (delegates)                */
    /* -------------------------------------------- */

    async deleteItem(ev: Event) {
        return deleteItem(this, ev);
    }

    async addItem(ev: Event, caller: unknown = this) {
        return addItem(this, ev, caller);
    }

    _onItemCreate(event: Event) {
        return onItemCreate(this, event);
    }

    /* -------------------------------------------- */
    /*  Action Methods                               */
    /* -------------------------------------------- */

    async _onActionAdd() {
        await this._createAction({name: game.i18n.localize("NONEX_IST_OD6S.ACTION_OTHER"), subtype: "misc"});
        await this.render();
    }

    async _onAvailableActionAdd(event: Event) {
        const target = event.currentTarget as HTMLElement;
        await this._createAction({
            name: target.dataset.name!,
            type: "availableaction",
            subtype: target.dataset.type!,
            itemId: target.dataset.id,
            rollable: target.dataset.rollable,
        });
    }

    /* -------------------------------------------- */
    /*  Drop Handling (delegates)                    */
    /* -------------------------------------------- */

    async _onDropItemGroup(event: Event, item: OD6SItemGroupItem, data: Record<string, unknown>) {
        return onDropItemGroup(this, event, item, data);
    }

    async _onDropSpeciesTemplate(event: Event, item: OD6SSpeciesTemplateItem, data: Record<string, unknown>) {
        return onDropSpeciesTemplate(this, event, item, data);
    }

    async _onDropCharacterTemplate(event: Event, item: OD6SCharacterTemplateItem, data: Record<string, unknown>) {
        return onDropCharacterTemplate(this, event, item, data);
    }

    async _addCharacterTemplate(item: OD6SCharacterTemplateItem) {
        return addCharacterTemplate(this, item);
    }

    async _templateItems(itemList: OD6STemplateItemEntry[]) {
        return templateItems(this, itemList);
    }

    async _onDrop(event: DragEvent) {
        return onDrop(this, event);
    }

    async _onDropItem(event: DragEvent, data: Record<string, unknown>) {
        return onDropItem(this, event, data);
    }

    async _onDropActor(event: Event, data: Record<string, unknown>) {
        return onDropActor(this, event, data);
    }

    /* -------------------------------------------- */
    /*  Sorting Methods (delegates)                  */
    /* -------------------------------------------- */

    _onSortItem(event: DragEvent, itemData: { _id: string; [key: string]: unknown }) {
        return onSortItem(this, event, itemData);
    }

    async _onSortCrew(event: DragEvent, data: { crewUuid: string }) {
        return onSortCrew(this, event, data);
    }

    async _onSortContainerItem(event: DragEvent, itemData: { _id: string; [key: string]: unknown }) {
        return onSortContainerItem(this, event, itemData);
    }

    async _onSortCargoItem(event: DragEvent, itemData: { _id: string; [key: string]: unknown }) {
        return onSortCargoItem(this, event, itemData);
    }

    /* -------------------------------------------- */
    /*  Utility Methods                              */
    /* -------------------------------------------- */

    _isEquippable(itemType: string) {
        return OD6S.equippable.includes(itemType);
    }

    async _createAction(data: { name: string; type?: string; subtype: string; rollable?: boolean | string; itemId?: string }) {
        if (data.name.startsWith("NONEX_IST_OD6S.")) {
            data.name = game.i18n.localize(data.name);
        }
        if (["dodge", "parry", "block", "vehicledodge"].includes(data.subtype)) {
            if (this.document.itemTypes.action.find((i: Item) => (i.system as OD6SActionItemSystem).subtype === data.subtype)) {
                ui.notifications.warn(game.i18n.localize("NONEX_IST_OD6S.ACTION_ONLY_ONE"));
                return;
            }
        }
        return await this.document.createEmbeddedDocuments("Item", [{
            name: data.name,
            type: "action",
            system: {
                type: data.type,
                subtype: data.subtype,
                rollable: data.rollable,
                itemId: data.itemId,
            },
        }]);
    }

    /* -------------------------------------------- */
    /*  Template Clearing Methods (delegates)        */
    /* -------------------------------------------- */

    async _onClearSpeciesTemplate() {
        return onClearSpeciesTemplate(this);
    }

    async _onClearCharacterTemplate() {
        return onClearCharacterTemplate(this);
    }

    /* -------------------------------------------- */
    /*  Roll Methods (delegates)                     */
    /* -------------------------------------------- */

    async _rollAvailableVehicleAction(ev: Event) {
        return rollAvailableVehicleAction(this, ev);
    }

    async _rollAvailableAction(ev: Event) {
        return rollAvailableAction(this, ev);
    }

    async _editEffect(ev: Event) {
        const target = ev.currentTarget as HTMLElement;
        const effect = this.document.effects.find((e: ActiveEffect) => e.id === target.dataset.effectId);
        if (!effect) return;
        new foundry.applications.sheets.ActiveEffectConfig({document: effect}).render({force: true});
    }

    /* -------------------------------------------- */
    /*  Crew Management (delegates)                  */
    /* -------------------------------------------- */

    async linkCrew(uuid: string) {
        return linkCrew(this.document, uuid);
    }

    async unlinkCrew(crewID: string) {
        return unlinkCrew(this.document, crewID);
    }

    /* -------------------------------------------- */
    /*  Rolling & Inventory (delegates)              */
    /* -------------------------------------------- */

    async _rollBodyPoints() {
        return rollBodyPoints(this);
    }

    async rollPurchase(ev: Event, buyerId: string) {
        return rollPurchaseHelper(this, ev, buyerId);
    }

    async _onPurchase(itemId: string, buyerId: string) {
        return onPurchase(this, itemId, buyerId);
    }

    async _onTransfer(itemId: string, senderId: string, recId: string) {
        return onTransfer(this, itemId, senderId, recId);
    }
}
