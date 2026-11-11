import {od6sroll} from "../../apps/roll";
import {od6sadvance} from "../advance";
import {od6sspecialize} from "../specialize";
import {od6sattributeedit} from "../attribute-edit";
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import * as logger from "../../system/logger";

 

interface DiceScore { dice: number; pips: number }

/**
 * Build an updated score for an "edit-X" two-input control: one input changes
 * dice while the other holds pips (or vice versa). Returns the new total score.
 */
function recalcScoreFromInput(
    target: HTMLInputElement,
    diceInputId: string,
    pipsInputId: string,
    oldScore: DiceScore,
): number {
    const newScore: DiceScore = {dice: 0, pips: 0};
    if (target.id === diceInputId) {
        newScore.pips = oldScore.pips;
        newScore.dice = +target.value;
    } else if (target.id === pipsInputId) {
        newScore.dice = oldScore.dice;
        newScore.pips = +target.value;
    } else {
        return od6sutilities.getScoreFromDice(oldScore.dice, oldScore.pips);
    }
    return od6sutilities.getScoreFromDice(newScore.dice, newScore.pips);
}

/**
 * Register the roll triggers (skill/attribute/spec click, weapon-action
 * click, body-points roll). Bound for any owner regardless of `isEditable`
 * (derived from update permission in v14; there is no PLAY/EDIT sheet mode).
 */
export function registerRollListeners(
    root: HTMLElement,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {

    const rollDialog = new (od6sroll);
    root.querySelectorAll<HTMLElement>('.rolldialog').forEach((elem) =>
        elem.addEventListener('click', rollDialog._onRollEvent.bind(sheet)));
    root.querySelectorAll<HTMLElement>('.actionroll').forEach((elem) =>
        elem.addEventListener('click', rollDialog._onRollItem.bind(sheet)));

    root.querySelectorAll<HTMLElement>('.rollbodypoints').forEach((elem) =>
        elem.addEventListener('click', async () => {
            const ok = await foundry.applications.api.DialogV2.confirm({
                window: {title: game.i18n.localize("NONEX_IST_OD6S.ROLL") + " " + game.i18n.localize(OD6S.bodyPointsName)},
                content: `<p>${game.i18n.localize("NONEX_IST_OD6S.CONFIRM_ROLL_BODYPOINTS")}</p>`,
            });
            if (ok) await sheet._rollBodyPoints();
        }));
}

/**
 * Register score-related event listeners (attributes, skills, specializations,
 * advances, funds, toughness, maneuverability, body points, etc.) on the actor sheet.
 */
export function registerScoreListeners(
    root: HTMLElement,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {

    // Attribute/skill advances
    const advanceDialog = new (od6sadvance);
    root.querySelectorAll<HTMLElement>('.advancedialog').forEach((elem) =>
        elem.addEventListener('click', advanceDialog._onAdvance.bind(sheet)));

    // Skill specialization
    const specializeDialog = new (od6sspecialize);
    root.querySelectorAll<HTMLElement>('.specializedialog').forEach((elem) =>
        elem.addEventListener('click', specializeDialog._onSpecialize.bind(sheet)));

    // Free edit attribute
    const attributeEditDialog = new od6sattributeedit();
    root.querySelectorAll<HTMLElement>('.attribute-edit').forEach((elem) =>
        elem.addEventListener('click', attributeEditDialog._onAttributeEdit.bind(sheet)));

    // Edit funds
    root.querySelectorAll<HTMLElement>('.edit-funds').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const target = ev.target as HTMLInputElement;
            const oldScore = od6sutilities.getDiceFromScore(sheet.document.system.funds.score);
            const updateScore = recalcScoreFromInput(target, 'funds-dice', 'funds-pips', oldScore);
            await sheet.document.update({id: sheet.document.id, 'system.funds.score': updateScore});
            sheet.render();
        }));

    // Edit maneuverability
    root.querySelectorAll<HTMLElement>('.edit-maneuverability').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const target = ev.target as HTMLInputElement;
            const oldScore = od6sutilities.getDiceFromScore(sheet.document.system.maneuverability.score);
            const updateScore = recalcScoreFromInput(target, 'maneuverability-dice', 'maneuverability-pips', oldScore);
            await sheet.document.update({id: sheet.document.id, 'system.maneuverability.score': updateScore});
            sheet.render();
        }));

    // Edit toughness
    root.querySelectorAll<HTMLElement>('.edit-toughness').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const target = ev.target as HTMLInputElement;
            const oldScore = od6sutilities.getDiceFromScore(sheet.document.system.toughness.score);
            const updateScore = recalcScoreFromInput(target, 'toughness-dice', 'toughness-pips', oldScore);
            await sheet.document.update({id: sheet.document.id, 'system.toughness.score': updateScore});
            sheet.render();
        }));

    // Edit body points
    root.querySelectorAll<HTMLElement>('.editbodypoints').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const target = ev.target as HTMLInputElement;
            await sheet.document.setWoundLevelFromBodyPoints(+target.value);
            sheet.render();
        }));

    // Edit active effect (score-related effects)
    root.querySelectorAll<HTMLElement>('.edit-effect').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            await sheet._editEffect(ev);
        }));

    // Event listener for skill usage checkboxes
    root.querySelectorAll<HTMLInputElement>('.skill-used-checkbox, .spec-used-checkbox').forEach((elem) =>
        elem.addEventListener('change', async (event: Event) => {
            const ct = event.currentTarget as HTMLInputElement;
            const itemId = ct.dataset.itemId;
            const item = sheet.document.items.get(itemId);

            if (item) {
                await item.update({'system.used.value': ct.checked})
                    .catch((err: unknown) => {
                        logger.error('sheet', 'Failed to update item used status:', err);
                        ui.notifications.error(String((err as Error)?.message ?? err));
                    });
            }
        }));

    // Event listener for Session Reset button
    root.querySelectorAll<HTMLElement>('.session-reset-button').forEach((elem) =>
        elem.addEventListener('click', async () => {
            const ok = await foundry.applications.api.DialogV2.confirm({
                window: {title: game.i18n.localize('NONEX_IST_OD6S.RESET_SESSION')},
                content: `<p>${game.i18n.localize('NONEX_IST_OD6S.CONFIRM_SESSION_RESET')}</p>`,
            });
            if (!ok) return;
            const checkboxes = root.querySelectorAll<HTMLInputElement>('.skill-used-checkbox, .spec-used-checkbox');
            const updates: Array<Record<string, unknown>> = [];
            checkboxes.forEach((checkbox) => {
                const itemId = checkbox.dataset.itemId;
                const item = itemId ? sheet.document.items.get(itemId) : undefined;
                if (item) {
                    updates.push({_id: item.id, 'system.used.value': false});
                    checkbox.checked = false;
                } else {
                    logger.error('sheet', 'Item not found for session reset:', itemId);
                }
            });
            if (updates.length === 0) return;
            try {
                await sheet.document.updateEmbeddedDocuments('Item', updates);
            } catch (err: unknown) {
                logger.error('sheet', 'Session reset failed:', err);
                ui.notifications.error(String((err as Error)?.message ?? err));
            }
        }));
}
