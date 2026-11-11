 

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class OD6SEditDifficulty extends HandlebarsApplicationMixin(ApplicationV2) {

    data: any;

    constructor(data: any = {}, options: any = {}) {
        super(options);
        this.data = data;
    }

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-edit-difficulty",
        classes: ["nonex-ist-od6s"],
        tag: "form",
        window: {
            title: "NONEX_IST_OD6S.EDIT_DIFFICULTY",
            minimizable: true,
        },
        position: {
            width: 320,
            height: "auto",
        },
        form: {
            handler: OD6SEditDifficulty.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        actions: {
            cancel: OD6SEditDifficulty.#onCancel,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/chat/edit-difficulty.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {data: this.data};
    }

    static async #onSubmit(
        this: OD6SEditDifficulty,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        const message = game.messages.get(data.messageId);
        if (!message) return;

        const diff = (+data.baseDifficulty) - (+message.getFlag("nonex-ist-od6s", "baseDifficulty"));
        const newDifficulty = (+message.getFlag("nonex-ist-od6s", "difficulty")) + diff;
        const success = message.rolls[0].total >= newDifficulty;

        await message.update({
            id: message.id,
            flags: {
                "nonex-ist-od6s": {
                    baseDifficulty: data.baseDifficulty,
                    difficulty: newDifficulty,
                    success,
                },
            },
        });
    }

    static async #onCancel(this: OD6SEditDifficulty): Promise<void> {
        await this.close();
    }
}
