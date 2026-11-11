
import {bindPrimaryTabs} from "../system/utilities/bind-tabs";
import * as labels from "./item-sheet-helpers/labels";
import * as effects from "./item-sheet-helpers/effects";
import * as actorTypes from "./item-sheet-helpers/actor-types";
import * as editFields from "./item-sheet-helpers/edit-fields";
import * as templateItems from "./item-sheet-helpers/template-items";
import * as drop from "./item-sheet-helpers/drop";

const {HandlebarsApplicationMixin} = foundry.applications.api;
const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;

/**
 * OD6S item sheet — ApplicationV2 with HandlebarsApplicationMixin.
 *
 * Template path is dynamic per item.type, so we override _renderHTML to
 * load the right template instead of declaring a multi-PARTS entry per type.
 *
 * Per-domain handlers live in `item-sheet-helpers/`; this class wires them
 * to DOM events and delegates without holding handler state.
 */
export class OD6SItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["nonex-ist-od6s", "sheet", "item"],
        position: {width: 520, height: 480},
        window: {resizable: true, minimizable: true},
        form: {submitOnChange: true, closeOnSubmit: false},
        actions: {},
    };

    static PARTS = {
        body: {template: "systems/nonex-ist-od6s/templates/item/item-weapon-sheet.html"},
    };

    get template(): string {
        return `systems/nonex-ist-od6s/templates/item/item-${this.item.type}-sheet.html`;
    }

    async _prepareContext(_options?: object): Promise<object> {
        return {
            item: this.item,
            system: this.item.system,
            editable: this.isEditable,
            owner: this.item.isOwner,
            actor: this.actor,
            cssClass: this.isEditable ? "editable" : "locked",
        };
    }

    async _renderHTML(context: object, _options: object): Promise<Record<string, HTMLElement>> {
        const html = await foundry.applications.handlebars.renderTemplate(this.template, context);
        const tempEl = document.createElement("div");
        tempEl.innerHTML = html;
        const element = tempEl.firstElementChild as HTMLElement | null;
        if (!element) throw new Error(`Item sheet template "${this.template}" produced no root element.`);
        element.dataset.applicationPart = "body";
        return {body: element};
    }

    _replaceHTML(result: Record<string, HTMLElement>, content: HTMLElement, _options: object): void {
        content.replaceChildren(result.body);
    }

    async _onRender(context: object, options: object): Promise<void> {
        await super._onRender(context, options);

        const root = this.element as HTMLElement;
        bindPrimaryTabs(this, root);

        if (!this.isEditable) return;
        const $ = (sel: string): NodeListOf<HTMLElement> => root.querySelectorAll(sel);

        $(".editskill").forEach((el) => el.addEventListener("change", (e) => editFields.editSkill(this, e)));
        $(".editspecialization").forEach((el) => el.addEventListener("change", (e) => editFields.editSpecialization(this, e)));
        $(".editweapondamage").forEach((el) => el.addEventListener("change", (e) => editFields.editWeaponDamage(this, e)));
        $(".editweaponstun").forEach((el) => el.addEventListener("change", (e) => editFields.editWeaponStunDamage(this, e)));
        $(".editweaponfirecontrol").forEach((el) => el.addEventListener("change", (e) => editFields.editWeaponFireControl(this, e)));
        $(".editarmor").forEach((el) => el.addEventListener("change", (e) => editFields.editArmor(this, e)));
        $(".edittemplateattribute").forEach((el) => el.addEventListener("click", (e) => templateItems.editTemplateAttribute(this, e)));
        $(".template-item-add").forEach((el) => el.addEventListener("click", (e) => templateItems.addTemplateItem(this, e)));
        $(".template-item-edit").forEach((el) => el.addEventListener("click", (e) => templateItems.editTemplateItem(this, e)));
        $(".template-item-delete").forEach((el) => el.addEventListener("click", (e) => templateItems.deleteTemplateItem(this, e)));
        $(".effect-add").forEach((el) => el.addEventListener("click", () => effects.addEffect(this.document)));
        $(".effect-edit").forEach((el) => el.addEventListener("click", (e) => effects.editEffect(this.document, e)));
        $(".effect-delete").forEach((el) => el.addEventListener("click", (e) => effects.deleteEffect(this.document, e)));
        $(".label-add").forEach((el) => el.addEventListener("click", () => labels.addLabel(this.item)));
        $(".label-edit").forEach((el) => el.addEventListener("change", (e) => labels.editLabel(this.item, e)));
        $(".label-delete").forEach((el) => el.addEventListener("click", (e) => labels.deleteLabel(this.item, e)));
        $(".add-actor-type").forEach((el) => el.addEventListener("click", () => actorTypes.addActorType(this.item)));
        $(".delete-actor-type").forEach((el) => el.addEventListener("click", (e) => actorTypes.deleteActorType(this.item, e)));
    }

    async _onDrop(event: DragEvent): Promise<void> {
        return drop.onDrop(this, event);
    }
}
