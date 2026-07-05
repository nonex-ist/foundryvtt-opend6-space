// Import Modules
import {OD6SActor} from "./actor/actor";
import {OD6SActorSheet} from "./actor/actor-sheet";
import {OD6SItem} from "./item/item";
import {OD6SItemSheet} from "./item/item-sheet";
import {OD6SToken} from "./overrides/token";
import OD6S from "./config/config-od6s";
import od6sSettings from "./config/settings-od6s";
import od6sHandlebars from "./system/handlebars"
import {OD6SCombat} from "./overrides/combat";
import {OD6SCombatTracker} from "./overrides/combat-tracker";
import {OD6SCompendiumDirectory} from "./overrides/compendium-directory";
import {registerMigrationSetting, migrateWorld} from "./system/migration";
import {WildDie} from "./dice/wild-die";
import {CharacterPointDie} from "./dice/character-point-die";
import {OD6SChat} from "./apps/chat-menu";

// TypeDataModel classes — Actor types
import CharacterData from "./data/actor/character";
import NPCData from "./data/actor/npc";
import CreatureData from "./data/actor/creature";
import VehicleData from "./data/actor/vehicle";
import StarshipData from "./data/actor/starship";
import ContainerData from "./data/actor/container";

// TypeDataModel classes — Item types
import SkillData from "./data/item/skill";
import SpecializationData from "./data/item/specialization";
import AdvantageData from "./data/item/advantage";
import DisadvantageData from "./data/item/disadvantage";
import SpecialAbilityData from "./data/item/specialability";
import ArmorData from "./data/item/armor";
import WeaponData from "./data/item/weapon";
import GearData from "./data/item/gear";
import CyberneticData from "./data/item/cybernetic";
import ManifestationData from "./data/item/manifestation";
import CharacterTemplateData from "./data/item/character-template";
import ActionData from "./data/item/action";
import VehicleItemData from "./data/item/vehicle";
import VehicleWeaponData from "./data/item/vehicle-weapon";
import VehicleGearData from "./data/item/vehicle-gear";
import StarshipWeaponData from "./data/item/starship-weapon";
import StarshipGearData from "./data/item/starship-gear";
import SpeciesTemplateData from "./data/item/species-template";
import ItemGroupData from "./data/item/item-group";

// Import extracted modules
import {rollItemMacro, rollItemNameMacro, simpleRoll} from "./macros";
import {registerSocketlib, getActorFromUuid} from "./socketlib";
import {registerRegionHooks} from "./hooks/region-hooks";
import {registerChatHooks} from "./hooks/chat-hooks";
import {registerChatLogListeners} from "./hooks/chat-log-listeners";
import {registerCombatHooks} from "./hooks/combat-hooks";
import {registerActorHooks} from "./hooks/actor-hooks";
import {registerDiceHooks} from "./hooks/dice-hooks";

od6sSettings();
od6sHandlebars();

Hooks.once('init', async function () {

    game["nonex-ist-od6s"] = {
        OD6SActor,
        OD6SItem,
        OD6SToken,
        rollItemMacro,
        rollItemNameMacro,
        simpleRoll,
        getActorFromUuid,
        diceTerms: [CharacterPointDie, WildDie],
        config: OD6S,
    };

    //CONFIG.debug.hooks = true

    // Register TypeDataModel classes for all actor and item types.
    // Without these, newly created actors/items get an empty `system` object
    // and prepareData() crashes accessing schema-defined fields.
    CONFIG.Actor.dataModels = {
        character: CharacterData,
        npc: NPCData,
        creature: CreatureData,
        vehicle: VehicleData,
        starship: StarshipData,
        container: ContainerData,
    };
    CONFIG.Item.dataModels = {
        skill: SkillData,
        specialization: SpecializationData,
        advantage: AdvantageData,
        disadvantage: DisadvantageData,
        specialability: SpecialAbilityData,
        armor: ArmorData,
        weapon: WeaponData,
        gear: GearData,
        cybernetic: CyberneticData,
        manifestation: ManifestationData,
        "character-template": CharacterTemplateData,
        action: ActionData,
        vehicle: VehicleItemData,
        "vehicle-weapon": VehicleWeaponData,
        "vehicle-gear": VehicleGearData,
        "starship-weapon": StarshipWeaponData,
        "starship-gear": StarshipGearData,
        "species-template": SpeciesTemplateData,
        "item-group": ItemGroupData,
    };

    /**
     * Set an initiative formula for the system
     * @type {String}
     */
    CONFIG.Combat.initiative = {
        formula: "@initiative.formula",
        decimals: 2
    };

    if (typeof Babele !== 'undefined') {
        Babele.get().setSystemTranslationsDir("lang/translations");
    }

    CONFIG.Combat.documentClass = OD6SCombat;
    CONFIG.ui.combat = OD6SCombatTracker;
    CONFIG.ui.compendium = OD6SCompendiumDirectory;
    CONFIG.statusEffects = OD6S.statusEffects;
    CONFIG.Dice.terms["w"] = WildDie;
    CONFIG.Dice.terms["b"] = CharacterPointDie;
    CONFIG.Token.objectClass = OD6SToken;

    CONFIG.ChatMessage.template = "systems/nonex-ist-od6s/templates/chat/chat.html";

    // Define custom Entity classes
    CONFIG.Actor.documentClass = OD6SActor;
    CONFIG.Item.documentClass = OD6SItem;

    // Register migration version setting
    registerMigrationSetting();

    // Register sheet application classes
    foundry.documents.collections.Actors.registerSheet("nonex-ist-od6s", OD6SActorSheet, {makeDefault: true});
    foundry.documents.collections.Items.registerSheet("nonex-ist-od6s", OD6SItemSheet, {makeDefault: true});
});

// Run world migration on ready
Hooks.once('ready', async () => {
    await migrateWorld();
});

// Register socketlib handlers
registerSocketlib();

// Register all hook handlers
registerRegionHooks();
registerChatHooks();
registerChatLogListeners();
registerCombatHooks();
registerActorHooks();
registerDiceHooks();

// Misc hooks that don't fit a category
Hooks.on('i18nInit', () => {
    game.i18n.translations.ITEM.TypeManifestation = OD6S.manifestationName;
})

// v14 fires `getChatMessageContextOptions` (the old `getChatLogEntryContext` /
// our custom `getOD6SChatLogEntryContext` is never emitted). The menuItems
// array is the second hook argument.
Hooks.on("getChatMessageContextOptions", (_application, options) => {
    OD6SChat.chatContextMenu(options);
})
