 
import {od6sutilities} from "../system/utilities";


const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class OD6SEditDamage extends HandlebarsApplicationMixin(ApplicationV2) {

    data: any;

    constructor(data: any = {}, options: any = {}) {
        super(options);
        this.data = data;
    }

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-edit-damage",
        classes: ["nonex-ist-od6s"],
        tag: "form",
        window: {
            title: "NONEX_IST_OD6S.EDIT_DAMAGE",
            minimizable: true,
        },
        position: {
            width: 320,
            height: "auto",
        },
        form: {
            handler: OD6SEditDamage.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        actions: {
            cancel: OD6SEditDamage.#onCancel,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/chat/edit-damage.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {data: this.data};
    }

    static async #onSubmit(
        this: OD6SEditDamage,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        const message = game.messages.get(data.messageId);
        if (!message) return;

        const damageScore = od6sutilities.getScoreFromDice(data.damageDice, data.damagePips);
        await message.setFlag("nonex-ist-od6s", "damageScore", damageScore);
        await message.setFlag("nonex-ist-od6s", "damageDice", {
            dice: data.damageDice,
            pips: data.damagePips,
        });
    }

    static async #onCancel(this: OD6SEditDamage): Promise<void> {
        await this.close();
    }
}
