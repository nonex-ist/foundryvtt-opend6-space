 
import {od6sutilities} from "../system/utilities";
import OD6S, {type CharacterPointLimits} from "../config/config-od6s";
import {od6sroll} from "./roll";
import {isCharacterActor} from "../system/type-guards";
import {MESSAGE_MODES} from "../hooks/chat-mode";
import type {RollData} from "./roll-helpers/roll-data";


const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

/** Minimal sheet handle the dialog reads `rollData` from. */
interface RollDialogActorSheet {
    rollData: RollData | undefined;
}

export class RollDialog extends HandlebarsApplicationMixin(ApplicationV2) {

    actorSheet: RollDialogActorSheet;
    rollData: RollData;
    cpLimit: CharacterPointLimits;
    onSubmit: () => void | Promise<void>;

    constructor(actorSheet: RollDialogActorSheet, onSubmit: () => void | Promise<void>, options: object = {}) {
        super(options);
        if (!actorSheet.rollData) {
            throw new Error("RollDialog requires actorSheet.rollData to be populated");
        }
        this.actorSheet = actorSheet;
        this.rollData = actorSheet.rollData;
        this.cpLimit = OD6S.characterPointLimits;
        this.onSubmit = onSubmit;
    }

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-roll-dialog",
        classes: ["nonex-ist-od6s", "dialog"],
        tag: "form",
        window: {
            title: "NONEX_IST_OD6S.ROLL",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 500,
            height: "auto",
        },
        form: {
            handler: RollDialog.#onSubmitForm,
            submitOnChange: false,
            closeOnSubmit: true,
        },
    };

    static PARTS = {
        standard: {
            template: "systems/nonex-ist-od6s/templates/roll.html",
        },
        metaphysics: {
            template: "systems/nonex-ist-od6s/templates/metaphysicsRoll.html",
        },
    };

    _configureRenderOptions(options: { parts?: string[] } & Record<string, unknown>): void {
        super._configureRenderOptions(options);
        const isMetaphysics = this.rollData?.template?.includes("metaphysics");
        options.parts = [isMetaphysics ? "metaphysics" : "standard"];
    }

    async _prepareContext(_options?: object): Promise<object> {
        const actor = this.rollData.actor;
        if (isCharacterActor(actor)) {
            this.rollData.cpcostcolor =
                this.rollData.characterpoints > actor.system.characterpoints.value ? "red" : "black";
        }
        if (typeof this.rollData.rollmode !== "string") {
            this.rollData.rollmode = (game.user.isGM && game.settings.get("nonex-ist-od6s", "hide-gm-rolls"))
                ? MESSAGE_MODES.GM
                : MESSAGE_MODES.PUBLIC;
        }
        return this.rollData;
    }

    async _onClose(_options: object): Promise<void> {
        if (!this.#submitted) {
            await od6sroll.cancelAction();
        }
    }

    #submitted = false;

    /**
     * Refresh the "resulting dice" preview (`{{setDice ...}}`) in place, without
     * re-rendering the whole dialog.
     *
     * A full `render()` on every numeric-modifier `change` re-rendered the form —
     * and because `change` fires on blur, clicking the Roll button blurred the
     * focused penalty input, tore down the DOM (including the submit button)
     * mid-click, and swallowed the first click. Patching just the preview text
     * keeps the submit button alive so a single click rolls (issue #193). Mirrors
     * the `setDice` Handlebars helper: dice minus the four penalties, clamped ≥ 0.
     */
    #updateDicePreview(): void {
        const root = this.element as HTMLElement | null;
        const preview = root?.querySelector<HTMLElement>(".roll-dice-preview");
        if (!preview) return;
        const rd = this.rollData;
        const dice = (+rd.dice || 0)
            - (+rd.actionpenalty || 0)
            - (+rd.woundpenalty || 0)
            - (+rd.stunnedpenalty || 0)
            - (+rd.otherpenalty || 0);
        preview.textContent = String(dice > 0 ? dice : 0);
    }

    _onRender(_context: object, _options: object): void {
        const root = this.element as HTMLElement;
        const find = (sel: string): HTMLElement | null => root.querySelector(sel);
        const findAll = (sel: string): NodeListOf<HTMLElement> => root.querySelectorAll(sel);

        // Clearing a number input yields `valueAsNumber === NaN`; coerce to a
        // safe default so it doesn't propagate into dice/difficulty math on
        // submit.
        const numField = (ev: Event, fallback = 0): number => {
            const raw = (ev.target as HTMLInputElement).valueAsNumber;
            return Number.isFinite(raw) ? raw : fallback;
        };

        find(".cpup")?.addEventListener("click", async () => {
            let rollType = this.rollData.type;
            const actor = this.rollData.actor;
            if (rollType === "weapon") {
                const item = actor.items.find((i: Item) => i.id === this.rollData.itemid);
                const spec = (item?.system as { specialization?: string } | undefined)?.specialization;
                const skill = (item?.system as { skill?: string } | undefined)?.skill;
                if (actor.items.find((i: Item) => i.type === "specialization" && i.name === spec)) {
                    rollType = "specialization";
                } else if (actor.items.find((i: Item) => i.type === "skill" && i.name === skill)) {
                    rollType = "skill";
                } else {
                    rollType = "attribute";
                }
            }

            if (rollType === "skill") {
                if (this.rollData.title.includes("Parry")) rollType = "parry";
                else if (this.rollData.title.includes("Dodge")) rollType = "dodge";
                else if (this.rollData.title.includes("Block")) rollType = "block";
            }
            if (this.rollData.subtype === "vehicledodge") rollType = "dodge";
            if (this.rollData.subtype === "parry") rollType = "parry";

            if (!isCharacterActor(actor)) return;
            if ((+this.rollData.characterpoints) >= this.cpLimit[rollType as keyof CharacterPointLimits]) {
                ui.notifications.warn(game.i18n.localize("NONEX_IST_OD6S.MAX_CP"));
            } else if ((+this.rollData.characterpoints) >= actor.system.characterpoints.value) {
                ui.notifications.warn(game.i18n.localize("NONEX_IST_OD6S.NOT_ENOUGH_CP_ROLL"));
            } else {
                this.rollData.characterpoints++;
                await this.render();
            }
        });

        find(".cpdown")?.addEventListener("click", async () => {
            if (this.rollData.characterpoints > 0) this.rollData.characterpoints--;
            await this.render();
        });

        find("#useattribute")?.addEventListener("change", async (ev) => {
            const value = (ev.target as HTMLSelectElement).value;
            this.rollData.attribute = value;
            const actor = this.rollData.actor;
            if (!isCharacterActor(actor)) return;
            const attributeScore = actor.system.attributes[value as keyof typeof actor.system.attributes].score;
            const skillItem = actor.items.find((i: Item) => i.name === this.rollData.label);
            const skillScore = (skillItem?.system as { score?: number } | undefined)?.score ?? 0;
            const newScore = (+attributeScore) + (+skillScore);
            const newDice = od6sutilities.getDiceFromScore(newScore);
            this.rollData.dice = newDice.dice;
            this.rollData.pips = newDice.pips;
            await this.render();
        });

        find("#scaledice")?.addEventListener("change", (ev) => {
            this.rollData.scaledice = numField(ev);
        });

        find("#bonusdice")?.addEventListener("change", (ev) => {
            this.rollData.bonusdice = numField(ev);
        });

        find("#bonuspips")?.addEventListener("change", (ev) => {
            this.rollData.bonuspips = numField(ev);
        });

        find(".timer input")?.addEventListener("change", async (ev) => {
            const item = this.rollData.actor.items.find((i: Item) => i.id === this.rollData.itemid);
            if (!item) return;
            const value = (ev.target as HTMLInputElement).valueAsNumber;
            await item.setFlag("nonex-ist-od6s", "explosiveTimer", value);
            this.rollData.timer = value;
            await this.render();
        });

        find(".contact input")?.addEventListener("change", async () => {
            const item = this.rollData.actor.items.find((i: Item) => i.id === this.rollData.itemid);
            if (!item) return;
            await item.setFlag("nonex-ist-od6s", "explosiveTimer", 0);
            this.rollData.contact = !this.rollData.contact;
            this.rollData.timer = 0;
            await this.render();
        });

        find("#fatepoint")?.addEventListener("click", async () => {
            const actor = this.rollData.actor;
            if (!isCharacterActor(actor)) return;
            this.rollData.fatepoint = !this.rollData.fatepoint;
            if (this.rollData.fatepoint && actor.system.fatepoints.value <= 0) {
                ui.notifications.warn(game.i18n.localize("NONEX_IST_OD6S.NOT_ENOUGH_FP_ROLL"));
                this.rollData.fatepoint = !this.rollData.fatepoint;
            }
            if (this.rollData.fatepoint) {
                this.rollData.dice = this.rollData.dice * 2;
                this.rollData.pips = this.rollData.pips * 2;
            } else {
                this.rollData.dice = this.rollData.originaldice;
                this.rollData.pips = this.rollData.originalpips;
            }
            await this.render();
        });

        find("#wilddie")?.addEventListener("click", async () => {
            this.rollData.wilddie = !this.rollData.wilddie;
            await this.render();
        });

        find("#fulldefense")?.addEventListener("click", async () => {
            this.rollData.fulldefense = !this.rollData.fulldefense;
            const actor = this.rollData.actor;
            if (isCharacterActor(actor)
                && actor.system.stuns.current && actor.system.stuns.rounds > 0) {
                this.rollData.stunnedpenalty = this.rollData.fulldefense
                    ? 0 : actor.system.stuns.current;
            }
            await this.render();
        });

        find("#stun")?.addEventListener("click", async () => {
            this.rollData.stun = !this.rollData.stun;
        });

        find("#difficulty")?.addEventListener("change", (ev) => {
            this.rollData.difficulty = numField(ev);
        });

        find("#actionpenalty")?.addEventListener("change", (ev) => {
            this.rollData.actionpenalty = numField(ev);
            this.#updateDicePreview();
        });

        find("#woundpenalty")?.addEventListener("change", (ev) => {
            this.rollData.woundpenalty = numField(ev);
            this.#updateDicePreview();
        });

        find("#stunnedpenalty")?.addEventListener("change", (ev) => {
            this.rollData.stunnedpenalty = numField(ev);
            this.#updateDicePreview();
        });

        find("#otherpenalty")?.addEventListener("change", (ev) => {
            this.rollData.otherpenalty = numField(ev);
            this.#updateDicePreview();
        });

        find("#shots")?.addEventListener("change", (ev) => {
            // Shots feeds `(shots - 1)` multishot math; an empty field means a
            // single shot, so fall back to 1 (0 would flip the penalty into a bonus).
            this.rollData.shots = numField(ev, 1);
        });

        find("#target")?.addEventListener("change", async (ev) => {
            const tokenId = (ev.target as HTMLSelectElement).value;
            this.rollData.target = this.rollData.targets.find((t) => t.id === tokenId);
            await this.render();
        });

        findAll(".difficultylevel select").forEach((sel) => {
            sel.addEventListener("change", async (ev) => {
                const target = ev.target as HTMLSelectElement;
                const wrapper = target.closest(".difficultylevel") as HTMLElement | null;
                const skillKey = wrapper?.dataset.skill;
                if (typeof skillKey !== "undefined" && this.rollData.skills) {
                    this.rollData.skills[skillKey].difficulty = target.value;
                } else {
                    this.rollData.difficultylevel = target.value;
                }
                await this.render();
            });
        });

        find("#range")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.range = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#attackoption")?.addEventListener("change", async (ev) => {
            const value = (ev.target as HTMLSelectElement).value;
            this.rollData.multishot = value === "NONEX_IST_OD6S.ATTACK_RANGED_SINGLE_FIRE_AS_MULTI";
            this.rollData.modifiers.attackoption = value;
            await this.render();
        });

        find("#calledshot")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.calledshot = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#cover")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.cover = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#coverlight")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.coverlight = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#coversmoke")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.coversmoke = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#miscmod")?.addEventListener("change", (ev) => {
            this.rollData.modifiers.miscmod = numField(ev);
        });

        find("#vehiclespeed")?.addEventListener("change", (ev) => {
            this.rollData.vehiclespeed = (ev.target as HTMLSelectElement).value;
        });

        find("#vehiclecollisiontype")?.addEventListener("change", (ev) => {
            this.rollData.vehiclecollisiontype = (ev.target as HTMLSelectElement).value;
        });

        find("#vehicleterraindifficulty")?.addEventListener("change", (ev) => {
            this.rollData.vehicleterraindifficulty = (ev.target as HTMLSelectElement).value;
        });

        find("#rollmode")?.addEventListener("change", (ev) => {
            this.rollData.rollmode = (ev.target as HTMLSelectElement).value;
        });
    }

    static async #onSubmitForm(
        this: RollDialog,
        _event: Event,
        _form: HTMLFormElement,
        _formData: object,
    ): Promise<void> {
        this.#submitted = true;
        await this.onSubmit();
    }
}
