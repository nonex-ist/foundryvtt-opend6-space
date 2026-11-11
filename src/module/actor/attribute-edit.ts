 
import {od6sutilities} from "../system/utilities";


export class od6sattributeedit {


    async _onAttributeEdit(event: any) {
        event.preventDefault();

        const attribute = event.currentTarget.dataset.attrname;
        const label = event.currentTarget.dataset.label;
        // @ts-expect-error this.actor is bound by mixin caller
        const score = this.actor.system.attributes[attribute].base;

        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/nonex-ist-od6s/templates/actor/common/attribute-edit.html",
            {score});

        const result = await foundry.applications.api.DialogV2.input({
            window: {title: game.i18n.format("NONEX_IST_OD6S.EDIT_NAMED", {name: label})},
            content,
            ok: {label: game.i18n.localize("NONEX_IST_OD6S.EDIT_ATTRIBUTE")},
        });
        if (!result) return;

        // @ts-expect-error this.actor is bound by mixin caller
        await od6sattributeedit.editAttributeAction(result.dice, result.pips, attribute, this.actor);
    }

    static async editAttributeAction(dice: any, pips: any, attribute: string, actor: any) {
        const newScore = od6sutilities.getScoreFromDice(dice, pips);

        const update: any = {};
        update.id = actor.id;
        update.system = {};
        update.system.attributes = {};
        update.system.attributes[attribute] = {};
        update.system.attributes[attribute].base = newScore;

        await actor.update(update, {"diff": true});
        //await actor.update({[system.attributes[attribute].score]: newScore});
        actor.render();
    }
}
