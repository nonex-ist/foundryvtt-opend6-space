import {od6sroll} from "../apps/roll";
import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import {isAnyWeaponItem, isActionItem, isCharacterActor, isVehicleActor, isSkillItem, isSpecializationItem, isVehicleBorneWeaponItem, isWeaponItem, isVehicleWeaponItem, isStarshipWeaponItem} from "../system/type-guards";
import {warnIfSchemaVersionMismatch, SCHEMA_VERSION_KEY} from "../system/schema-version";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class OD6SItem extends Item {

    /**
     * Set the image as blank if it doesn't exist, rather than the default
     * @param data
     * @param options
     * @returns {Promise<abstract.Document>}
     */
    static async create(data: any, options={}) {
        if (!data.img)
            data.img = "systems/nonex-ist-od6s/icons/blank.png";
        return await super.create(data, options);
    }

    async _preCreate(data: object, options: object, user: User) {
        await super._preCreate(data, options, user);
        // #85: stamp the schema version of the running system on new items.
        // updateSource is V2; project type stubs predate it.
        const version = game.system?.version;
        if (version) {
            const sys = (this.system ?? {}) as unknown as Record<string, unknown>;
            if (!sys[SCHEMA_VERSION_KEY]) {
                (this as unknown as { updateSource: (changes: Record<string, unknown>) => void })
                    .updateSource({ [`system.${SCHEMA_VERSION_KEY}`]: version });
            }
        }
    }

    /*
     * Augment the basic Item data model with additional dynamic data.
     */
    prepareData() {
        // Warn before super so a mismatch is logged even when downstream
        // preparation throws — that's exactly the case the diagnostic exists for.
        warnIfSchemaVersionMismatch(this, this.system as unknown as Record<string, unknown>);
        super.prepareData();
        (this.system as unknown as Record<string, unknown>).config = OD6S;
    }

    prepareBaseData() {
        super.prepareBaseData();
    }

    /**
     * Create derived data for the item
     */
    prepareDerivedData() {
        if (isSkillItem(this) || isSpecializationItem(this)) {
            this.system.score = (+this.system.base) + (+this.system.mod);
        }
        if (isVehicleWeaponItem(this) || isStarshipWeaponItem(this)) {
            const sys = this.system;
            sys.stats = {
                attribute: sys.attribute.value,
                skill: sys.skill.value,
                specialization: sys.specialization.value,
            };
            sys.subtype = 'vehiclerangedweaponattack';
        }
    }

    findActiveEffects() {
        const changes = [];
        const type = this.type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const name = this.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const itemRegex = new RegExp(`^(system)?.?(items)?.?${type}s?.${name}.`);
        if(this?.actor !== null) {
            for (const effect of this.actor.allApplicableEffects()) {
                if (!effect?.active) continue;
                changes.push(...effect.system.changes.filter(c => c.type === "custom" &&
                    c.key.match(itemRegex)));
            }
            for (const change in changes) {
                const changeValue = od6sutilities.evaluateChange(changes[change], this);
                const newProp = changes[change].key.replace(itemRegex, '');
                const origValue = foundry.utils.getProperty(this, newProp);
                if (typeof (origValue) === 'undefined' || origValue === null) continue;
                foundry.utils.setProperty(this, newProp, changeValue + origValue);
            }
        }
    }

    applyMods() {
        if (isSkillItem(this) || isSpecializationItem(this)) {
            this.system.score = (+this.system.base) + (+this.system.mod);
        }
    }

    getScore(): number | undefined {
        if ((isSkillItem(this) || isSpecializationItem(this)) && this.actor
            && (isCharacterActor(this.actor) || isVehicleActor(this.actor))) {
            if (this.system.isAdvancedSkill) {
                return this.system.score;
            } else {
                return (this.actor.system.attributes[this.system.attribute.toLowerCase()]?.score ?? 0) + this.system.score;
            }
        }
        if (isAnyWeaponItem(this)
            && this.actor && (isCharacterActor(this.actor) || isVehicleActor(this.actor))) {
            const stats = this.system.stats;
            // `fire_control` is only on vehicle / starship-weapon systems; for
            // hand weapons it's absent (the legacy cast spliced it in optionally).
            const fireControlScore = isVehicleBorneWeaponItem(this)
                && (this.system.fire_control?.score as unknown) !== ''
                ? this.system.fire_control.score
                : 0;
            let score = (this.actor.system.attributes[stats.attribute.toLowerCase()]?.score ?? 0);
            const spec = this.actor.items.find(i => i.name === stats.specialization && i.type === 'specialization');
            if (spec !== undefined && isSpecializationItem(spec)) {
                return score + fireControlScore + spec.system.score;
            }
            const skill = this.actor.items.find(i => i.name === stats.skill && i.type === 'skill');
            if (skill !== undefined && isSkillItem(skill)) {
                return score + fireControlScore + skill.system.score;
            }
            score = score + fireControlScore;
            return score;
        }
        return undefined;
    }

    getScoreText(): string | undefined {
        return od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(this.getScore() ?? 0))
    }

    getParryText(): string | undefined {
        if (isWeaponItem(this) && this.actor) {
            if (this.system.stats.parry_specialization !== '') {
                const spec = this.actor.items.find(s => s.name === this.system.stats.parry_specialization && s.type === 'specialization');
                if (typeof spec !== 'undefined') return spec.getScoreText();
            }
            if (this.system.stats.parry_skill !== '') {
                const skill = this.actor.items.find(s => s.name === this.system.stats.parry_skill && s.type === 'skill');
                if (typeof skill !== 'undefined') return skill.getScoreText();
            }
            return this.actor.getActionScoreText('parry');
        }
        return undefined;
    }

    /**
     * Filter the Create New Item dialog
     */
    static async createDialog(
        data: { name?: string; folder?: string; type?: string; [key: string]: unknown } = {},
        {parent=null, pack=null, ..._options}: { parent?: Actor | null; pack?: string | null; [key: string]: unknown } = {},
    ) {

        // Collect data
        const documentName = this.metadata.name;
        let types = game.documentTypes[documentName].filter(t => t !== CONST.BASE_DOCUMENT_TYPE);
        let collection;
        if ( !parent ) {
            if ( pack ) collection = game.packs.get(pack);
            else collection = game.collections.get(documentName);
        }
        const folders = collection?._formatFolderSelectOptions() ?? [];
        const label = game.i18n.localize(this.metadata.label);
        const title = game.i18n.format("DOCUMENT.Create", {type: label});

        types = types.filter(function (value, _index, _arr) {
            return value !== 'action' && value !== 'vehicle' && value !== 'base';
        });

        if (game.settings.get('nonex-ist-od6s', 'hide_advantages_disadvantages')) {
            types = types.filter(function (value, _index, _arr) {
                return value !== 'advantage';
            })
            types = types.filter(function (value, _index, _arr) {
                return value !== 'disadvantage';
            })
        }

        types = types.sort(function (a, b) {
            return a.localeCompare(b);
        })

        // Render the document creation form. The V1 globals
        // (renderTemplate, Dialog, FormDataExtended) produce the
        // unstyled grey/white-text dialog; route through the V2
        // namespaces instead.
        const html = await foundry.applications.handlebars.renderTemplate(
            "templates/sidebar/document-create.html",
            {
                folders,
                name: data.name || game.i18n.format("DOCUMENT.New", {type: label}),
                folder: data.folder,
                hasFolders: folders.length >= 1,
                type: data.type || CONFIG[documentName]?.defaultType || types[0],
                types: types.reduce<Record<string, string>>((obj, t) => {
                    const label = CONFIG[documentName]?.typeLabels?.[t] ?? t;
                    obj[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
                    return obj;
                }, {}),
                hasTypes: types.length > 1
            },
        );

        // DialogV2.input parses the rendered <form>'s named inputs into
        // an object on submit, and returns null on cancel. Note: the V1
        // Dialog.prompt forwarded `options` here, but those are
        // document-create options (renderSheet etc.) that get passed to
        // this.create below — not dialog config. Don't spread them.
        const result = await foundry.applications.api.DialogV2.input({
            window: {title},
            content: html,
            ok: {label: title},
        });
        if (!result) return null;

        foundry.utils.mergeObject(data, result, {inplace: true});
        if (!data.folder) delete data.folder;
        if (types.length === 1) data.type = types[0];
        if (!data.name?.trim()) data.name = this.defaultName();
        return this.create(data, {parent, pack, renderSheet: true});
    }

    /**
     * Handle clickable item rolls.
     * @private
     */
    async roll(parry = false, regionId?: string) {
        // Basic template rendering data
        const item = this;
        if (!this.actor) return;
        const actor = this.actor;
        // Cast keeps the call sites uniform across actor types — vehicle and
        // character system schemas both expose `attributes`, but the rest of
        // `roll()` also reads character-only fields (e.g. `funds`, `credits`)
        // in the action / purchase paths. Vehicle items normally roll through
        // `Actor.rollAction`, not here.
        const actorData = actor.system as OD6SCharacterSystem;
        let flatPips = 0;

        const rollData: any = {};
        rollData.token = this.parent.sheet.token;
        if (regionId) rollData.regionId = regionId;

        switch (item.type) {
            case 'skill':
            case 'specialization': {
                if (!isSkillItem(item) && !isSpecializationItem(item)) break;
                const sys = item.system;
                if (OD6S.flatSkills) {
                    rollData.score = +((actorData.attributes[sys.attribute.toLowerCase()]?.score ?? 0));
                    flatPips = (+sys.score)
                } else {
                    if (sys.isAdvancedSkill) {
                        rollData.score = (+sys.score);
                    } else {
                        rollData.score = (+sys.score) + (actorData.attributes[sys.attribute.toLowerCase()]?.score ?? 0);
                    }
                }
                break;
            }
            case 'starship-weapon':
            case 'vehicle-weapon':
            case 'weapon': {
                if (!isAnyWeaponItem(item)) break;
                const sys = item.system;
                // Try a specialization first, then a skill, then an attribute
                let found = false;

                if (parry && game.settings.get('nonex-ist-od6s','parry_skills')) {
                    let skill;
                    // parry_skill / parry_specialization only exist on regular
                    // hand/personal weapons; vehicle/starship weapons can't parry.
                    const parrySpec = isWeaponItem(item) ? item.system.stats.parry_specialization : '';
                    const parrySkill = isWeaponItem(item) ? item.system.stats.parry_skill : '';
                    if(typeof parrySpec !== "undefined" && parrySpec !== "") {
                        skill = actor.items.find((skill: Item) => skill.name === parrySpec && skill.type === 'specialization');
                    }
                    else if(typeof parrySkill !== "undefined" && parrySkill !== "") {
                    	skill = actor.items.find((skill: Item) => skill.name === parrySkill && skill.type === 'skill');
                     } else {
                    	skill = actor.items.find((skill: Item) => skill.name === game.i18n.localize(OD6S.actions.parry.skill) && skill.type === 'skill');
                    }
                    if (skill && (isSkillItem(skill) || isSpecializationItem(skill))) {
                        const skillSys = skill.system;
                        if(OD6S.flatSkills) {
                            rollData.score = (+(actorData.attributes[skillSys.attribute.toLowerCase()]?.score ?? 0));
                            flatPips = (+skillSys.score);
                        } else {
                            rollData.score = (+skillSys.score) + (+(actorData.attributes[skillSys.attribute.toLowerCase()]?.score ?? 0));
                        }
                    } else {
                        rollData.score = actorData.attributes[OD6S.actions.parry.base.toLowerCase()].score;
                    }
                    found = true;
                }

                if (!found && sys.stats.specialization !== null) {
                    const spec = actor.items.find((spec: Item) => spec.name === sys.stats.specialization && spec.type === 'specialization');
                    if (spec && isSpecializationItem(spec)) {
                        const specSys = spec.system;
                        if(OD6S.flatSkills) {
                            rollData.score = (+(actorData.attributes[specSys.attribute.toLowerCase()]?.score ?? 0));
                            flatPips = (+specSys.score);
                        } else {
                            rollData.score = (+specSys.score) + (+(actorData.attributes[specSys.attribute.toLowerCase()]?.score ?? 0));
                        }
                        found = true;
                    }
                }
                if (!found) {
                    // See if the actor has the associated skill
                    const skill = actor.items.find((skill: Item) => skill.name === sys.stats.skill && skill.type === 'skill');
                    let attr = actorData.attributes[sys.stats.attribute.toLowerCase()];
                    if(typeof(attr?.score) === "undefined" || attr === null) {
                        // See if it maps to the "shortname" of a custom attribute label
                        // @ts-expect-error
                        attr = actorData.attributes[od6sutilities.lookupAttributeKey(sys.stats.attribute.toLowerCase())];
                        if(typeof(attr?.score) === "undefined" || attr === null) return false;
                    }
                    if (skill && isSkillItem(skill)) {
                        const skillSys = skill.system;
                        if(OD6S.flatSkills) {
                            rollData.score = (+attr.score);
                            flatPips = (+skillSys.score);
                        } else {
                            rollData.score = (+skillSys.score) + (+attr.score);
                        }
                    } else {
                        // Finally, use base attribute
                        if(item.type === 'vehicle-weapon' || item.type === 'starship-weapon') {
                            rollData.score = attr.score;
                        } else if (item.type === 'weapon') {

                            rollData.score = attr.score;
                        }
                        else {
                            rollData.score = attr.score;
                        }
                    }
                }
                break;
            }
            case 'action': {
                if (!isActionItem(item)) break;
                const sys = item.system;
                let name = '';
                if ((sys.subtype === 'rangedattack' || sys.subtype === 'meleeattack') && sys.itemId !== '') {
                    // Roll is linked to an inventory item, roll that instead
                    const targetItem = actor.items.find((i: Item) => i.id === sys.itemId);
                    return targetItem?.roll(parry);
                }

                if (sys.subtype === 'dodge' || sys.subtype === 'parry' || sys.subtype === 'block') {
                    // Get the appropriate skill or attribute
                    switch (sys.subtype) {
                        case 'dodge':
                            name = 'NONEX_IST_OD6S.DODGE';
                            break;
                        case 'parry':
                            if (actor.items.find((i: Item) => i.id === sys.itemId)) {
                                const targetItem = actor.items.find((i: Item) => i.id === sys.itemId);
                                return targetItem?.roll(true);
                            } else {
                                name = OD6S.actions.parry.skill;
                            }
                            break;
                        case 'block':
                            name = OD6S.actions.block.skill;
                            break;
                    }
                }
                name = game.i18n.localize(name);

                if (sys.subtype === 'attribute') {
                    rollData.attribute = sys.itemId;
                } else {
                    let skill;
                    //let name = item.name;
                    name = game.i18n.localize(name);
                    if (typeof (sys.itemId) !== 'undefined' && sys.itemId !== '') {
                        skill = actor.items.find((i: Item) => i.type === sys.subtype && i.id === sys.itemId);
                    } else {
                        skill = actor.items.find((i: Item) => i.name === name);
                    }
                    if (skill && (isSkillItem(skill) || isSpecializationItem(skill))
                        && typeof skill.system.score !== 'undefined') {
                        const skillSys = skill.system;
                        if(OD6S.flatSkills) {
                            rollData.score = (+(actorData.attributes[skillSys.attribute.toLowerCase()]?.score ?? 0));
                            flatPips = (+skillSys.score);
                        } else {
                            // Advanced-skill check is on the resolved skill, not
                            // the action item — legacy code cast `this.system as
                            // OD6SSkillItemSystem` and read `isAdvancedSkill`,
                            // which was always undefined → falsy on actions, so
                            // this branch was effectively unreachable. Now it
                            // actually fires when a routed skill is advanced.
                            if(skillSys.isAdvancedSkill) {
                                rollData.score = (+skillSys.score);
                            } else {
                                rollData.score = (+skillSys.score) + (+(actorData.attributes[skillSys.attribute.toLowerCase()]?.score ?? 0));
                            }
                        }
                    } else {
                        // Search compendia for the skill and use the attribute
                        skill = (await od6sutilities._getItemFromWorld(name)) as Item | undefined;
                        if (skill && isSkillItem(skill)) {
                            rollData.score = (+(actorData.attributes[skill.system.attribute.toLowerCase()]?.score ?? 0));
                        } else {
                            skill = (await od6sutilities._getItemFromCompendium(name)) as Item | undefined;
                            if (skill && isSkillItem(skill)) {
                                rollData.score = (+(actorData.attributes[skill.system.attribute.toLowerCase()]?.score ?? 0));
                            } else {
                                // Cannot find, use defaults for the type
                                for (const a in OD6S.actions) {
                                    if (OD6S.actions[a].type === sys.subtype) {
                                        rollData.score = (+actorData.attributes[OD6S.actions[a].base].score);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                break;
            }
        }

        if (isVehicleBorneWeaponItem(item)) {
            if(item.system.fire_control.score > 0) {
                rollData.score = (+rollData.score) + (+item.system.fire_control.score);
            }
        }

        // Weapons carry their localized weapon-type label (OD6S.MELEE / OD6S.RANGED
        // / …) in `system.subtype`; classifyRoll normalizes that to canonical
        // `meleeattack` / `rangedattack`, which the melee-range preflight gate
        // and downstream bonus accumulators rely on. Pre-#57 this read
        // `itemData.subtype` unconditionally; the discriminated-union narrowing
        // dropped the weapon branch and silently passed `subtype: ''`, breaking
        // the melee-range gate and personal melee/ranged mod application via
        // `item.roll()`.
        let subtype = '';
        if (isActionItem(item) || isAnyWeaponItem(item)) {
            subtype = item.system.subtype;
        }
        if (parry) {
            subtype = "parry";
        }

        if(flatPips > 0) {
            rollData.flatpips = flatPips;
        }

        rollData.name = item.name;
        rollData.type = item.type;
        rollData.actor = this.actor;
        rollData.itemId = item.id;
        rollData.subtype = subtype;

        await od6sroll._onRollDialog(rollData);
    }
}
