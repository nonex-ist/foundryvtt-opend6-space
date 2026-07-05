/**
 * Minimal Foundry VTT v14 type stubs for the od6s system.
 * These cover the globals and APIs we use — not a complete type definition.
 * Uses `any` liberally to eliminate errors without perfect typing.
 *
 * NOTE: The base document class is named FoundryDocument (not Document)
 * to avoid collision with the DOM Document interface. All Foundry document
 * subclasses (Actor, Item, etc.) extend FoundryDocument.
 */

// ---- Core Globals ----

declare const game: Game;
declare const canvas: Canvas;
declare const ui: UI;
declare const Hooks: HooksAPI;
declare const CONFIG: FoundryConfig;
declare const CONST: FoundryConstants;
declare const socketlib: SocketLib;
declare const Babele: BabeleAPI | undefined;

/** Handlebars global for template helpers */
declare const Handlebars: HandlebarsStatic;

interface HandlebarsStatic {
    registerHelper(name: string, fn: (...args: any[]) => any): void;
    unregisterHelper(name: string): void;
    registerPartial(name: string, partial: string): void;
    compile(template: string, options?: any): (data: any) => string;
    SafeString: new (str: string) => any;
    Utils: any;
    [key: string]: any;
}

/** Resolve a Document from a UUID string */
declare function fromUuid(uuid: string): Promise<any>;
declare function fromUuidSync(uuid: string): any;

/** Render a Handlebars template */
declare function renderTemplate(path: string, data?: object): Promise<string>;

/** Audio playback helper */
declare class AudioHelper {
    static play(options: { src: string; volume?: number; autoplay?: boolean; loop?: boolean }): any;
}

/** TextEditor utility for rich text and drag/drop operations */
declare class TextEditor {
    static getDragEventData(event: DragEvent): any;
    static enrichHTML(content: string, options?: any): Promise<string>;
    static create(options?: any): Promise<any>;
    [key: string]: any;
}

/** Settings configuration UI */
declare class SettingsConfig {
    static reloadConfirm(options?: { world?: boolean }): Promise<void>;
}

/** World/System/Module package classes used in CompendiumDirectory */
declare class World {
    static icon: string;
}
declare class System {
    static icon: string;
}
declare class Module {
    static icon: string;
}

// ---- Foundry Namespace ----

declare namespace foundry {
    namespace canvas {
        namespace geometry {
            class Ray {
                constructor(A: { x: number; y: number }, B: { x: number; y: number });
                A: { x: number; y: number };
                B: { x: number; y: number };
                angle: number;
                distance: number;
                static fromAngle(x: number, y: number, radians: number, distance: number): Ray;
            }
        }
    }

    namespace utils {
        function mergeObject<T extends object>(original: T, other: any, options?: MergeObjectOptions): T;
        function deepClone<T>(original: T): T;
        function hasProperty(object: object, key: string): boolean;
        function isNewerVersion(v1: string, v2: string): boolean;
        function getProperty(object: object, key: string): any;
        function setProperty(object: object, key: string, value: any): boolean;
        function randomID(length?: number): string;
        // v13+ home of the sort helper (was `foundry.utils.SortingHelpers.performIntegerSort`).
        function performIntegerSort<T>(
            source: T,
            options: { target: T | undefined | null; siblings: T[]; sortKey?: string; sortBefore?: boolean }
        ): { target: T; update: Record<string, any> }[];
    }

    namespace applications {
        namespace api {
            class ApplicationV2 {
                static DEFAULT_OPTIONS: ApplicationV2Options;
                static PARTS: Record<string, ApplicationV2Part>;
                constructor(options?: object);
                get element(): HTMLElement;
                /** v14 accepts boolean (legacy `force`) or an options object */
                render(options?: object | boolean, _options?: object): Promise<this>;
                close(options?: object): Promise<this>;
                _onRender(context: object, options: object): void;
                _prepareContext(options?: object): Promise<object>;
                _configureRenderOptions(options: object): void;
                tabGroups?: Record<string, string>;
            }

            function HandlebarsApplicationMixin<T extends new (...args: any[]) => any>(
                base: T
            ): T;

            class DialogV2 {
                static input(options: any): Promise<any>;
                static confirm(options: any): Promise<boolean>;
                static prompt(options: any): Promise<any>;
                static wait(options: any): Promise<any>;
            }
        }

        namespace settings {
            class SettingsConfig {
                static reloadConfirm(options?: { world?: boolean }): Promise<boolean>;
            }
        }

        namespace sheets {
            class ActorSheetV2 extends applications.api.ApplicationV2 {
                get actor(): Actor;
                get document(): Actor;
                get isEditable(): boolean;
            }
            class ItemSheetV2 extends applications.api.ApplicationV2 {
                get item(): Item;
                get document(): Item;
                get actor(): Actor | null;
                get isEditable(): boolean;
            }
            class ActiveEffectConfig extends applications.api.ApplicationV2 {
                constructor(options?: { document?: ActiveEffect } & Record<string, unknown>);
            }
        }

        namespace sidebar {
            namespace tabs {
                /** Base sidebar tab for CombatTracker */
                class CombatTracker {
                    static get defaultOptions(): any;
                    get viewed(): Combat;
                    render(force?: boolean, options?: any): any;
                    _onCombatantControl(event: Event): Promise<void>;
                    _onToggleDefeatedStatus(combatant: Combatant): Promise<void>;
                    [key: string]: any;
                }

                /** Base sidebar tab for ChatLog */
                class ChatLog {
                    static get defaultOptions(): any;
                    rendered: boolean;
                    _lastMessageTime: number;
                    notify(message: ChatMessage): void;
                    scrollBottom(): void;
                    [key: string]: any;
                }

                /** Base sidebar tab for CompendiumDirectory */
                class CompendiumDirectory {
                    static get defaultOptions(): any;
                    collection: Collection<any>;
                    activeFilters: string[];
                    getData(options?: any): Promise<any> | any;
                    [key: string]: any;
                }
            }
        }

        namespace handlebars {
            function loadTemplates(paths: string[] | Record<string, string>): Promise<Function[]>;
            function renderTemplate(path: string, data?: object): Promise<string>;
        }

        namespace ux {
            interface TabsOptions {
                navSelector: string;
                contentSelector: string;
                initial?: string;
                group?: string;
                callback?: (event: Event, tabs: unknown, active: string) => void;
            }
            class Tabs {
                constructor(options: TabsOptions);
                bind(html: HTMLElement): void;
            }
            /** Drag/drop helper used by sheets that accept dropped documents */
            class DragDrop {
                static implementation: typeof DragDrop;
                constructor(options?: any);
                bind(html: HTMLElement | JQuery): void;
                [key: string]: any;
            }
            /** v14-namespaced TextEditor utility (replaces the global `TextEditor`) */
            class TextEditor {
                static implementation: typeof TextEditor;
                static getDragEventData(event: DragEvent): Record<string, unknown>;
                static enrichHTML(content: string, options?: any): Promise<string>;
                static create(options?: any): Promise<any>;
                [key: string]: any;
            }
        }
    }

    namespace abstract {
        class DataModel {
            static defineSchema(): Record<string, DataField>;
            static migrateData(source: object): object;
            static shimData(data: object, options?: object): object;
        }
        class TypeDataModel extends DataModel {
            parent: FoundryDocument;
        }
    }

    namespace data {
        namespace fields {
            class DataField {
                constructor(options?: DataFieldOptions);
            }
            class StringField extends DataField {
                constructor(options?: StringFieldOptions);
            }
            class NumberField extends DataField {
                constructor(options?: NumberFieldOptions);
            }
            class BooleanField extends DataField {
                constructor(options?: DataFieldOptions);
            }
            class SchemaField extends DataField {
                constructor(fields: Record<string, DataField>, options?: DataFieldOptions);
            }
            class ArrayField extends DataField {
                constructor(element: DataField, options?: DataFieldOptions);
            }
            class ObjectField extends DataField {
                constructor(options?: DataFieldOptions);
            }
            class HTMLField extends DataField {
                constructor(options?: DataFieldOptions);
            }
            class DocumentUUIDField extends DataField {
                constructor(options?: DataFieldOptions);
            }
        }
    }

    /** Dice term classes accessible via foundry.dice.terms */
    namespace dice {
        namespace terms {
            class Die extends DiceTerm {
                static DENOMINATION: string;
                faces: number;
                number: number;
                modifiers: string[];
                constructor(termData?: DiceTermData);
            }
        }
    }

    /** Canvas placeable classes */
    namespace canvas {
        namespace placeables {
            class Token {
                id: string;
                actor: Actor;
                center: Point;
                object: Token;
                controlled: boolean;
                _movement: any;
                x: number;
                y: number;
                w: number;
                h: number;
                width: number;
                height: number;
                name: string;
                isOwner: boolean;
                document: TokenDocument;
                toggleEffect(effect: any, options?: any): Promise<void>;
                _canDrag(user: User, event: any): boolean;
                [key: string]: any;
            }
        }
    }

    /** Keyboard/interaction helpers */
    namespace helpers {
        namespace interaction {
            class KeyboardManager {
                static MODIFIER_KEYS: {
                    CONTROL: string;
                    SHIFT: string;
                    ALT: string;
                    [key: string]: string;
                };
                isModifierActive(key: string): boolean;
                [key: string]: any;
            }
        }
    }

    /** Document collection classes for sheet registration */
    namespace documents {
        namespace collections {
            class Actors {
                static registerSheet(scope: string, sheetClass: any, options?: any): void;
                static unregisterSheet(scope: string, sheetClass: any): void;
            }
            class Items {
                static registerSheet(scope: string, sheetClass: any, options?: any): void;
                static unregisterSheet(scope: string, sheetClass: any): void;
            }
        }
    }

    /** Application v1 classes (deprecated but still used) */
    namespace appv1 {
        namespace sheets {
            class ActorSheet {
                [key: string]: any;
            }
            class ItemSheet {
                [key: string]: any;
            }
        }
    }
}

// ---- Data Field Options ----

interface DataFieldOptions {
    required?: boolean;
    nullable?: boolean;
    initial?: any;
    label?: string;
}

interface StringFieldOptions extends DataFieldOptions {
    blank?: boolean;
    choices?: string[] | Record<string, string>;
    trim?: boolean;
    textSearch?: boolean;
}

interface NumberFieldOptions extends DataFieldOptions {
    min?: number;
    max?: number;
    step?: number;
    integer?: boolean;
    positive?: boolean;
}

interface MergeObjectOptions {
    insertKeys?: boolean;
    insertValues?: boolean;
    overwrite?: boolean;
    recursive?: boolean;
    inplace?: boolean;
    enforceTypes?: boolean;
    performDeletions?: boolean;
}

// ---- Application V2 Types ----

interface ApplicationV2Options {
    id?: string;
    classes?: string[];
    tag?: string;
    window?: {
        title?: string;
        icon?: string;
        resizable?: boolean;
        minimizable?: boolean;
        positioned?: boolean;
    };
    position?: {
        width?: number | string;
        height?: number | string;
    };
    actions?: Record<string, (event: Event, target: HTMLElement) => void>;
    form?: {
        /**
         * Foundry calls form handlers with a SubmitEvent at runtime; subclasses may
         * narrow to that. Accept either Event or SubmitEvent and a permissive form
         * data shape so call sites that read `formData.object` (FormDataExtended)
         * or treat it as a plain record both type-check.
         */
        handler?: (
            this: any,
            event: any,
            form: HTMLFormElement,
            formData: any,
        ) => void | Promise<void>;
        submitOnChange?: boolean;
        closeOnSubmit?: boolean;
    };
}

interface ApplicationV2Part {
    template: string;
    scrollable?: string[];
}

// ---- Base Foundry Document ----

/**
 * Base Document class for Foundry VTT.
 * Named FoundryDocument to avoid collision with the DOM Document interface.
 * All Foundry document subclasses (Actor, Item, etc.) extend this.
 */
declare class FoundryDocument {
    _id: string;
    id: string;
    uuid: string;
    name: string;
    type: string;
    system: any;
    flags: Record<string, any>;
    parent: any;
    sort: number;
    img: string;
    documentName: string;
    get visible(): boolean;
    set visible(value: boolean);
    isOwner: boolean;
    ownership: Record<string, number>;
    sheet: any;
    rendered: boolean;

    static TYPES: string[];
    static metadata: { name: string; label: string; [key: string]: any };
    static create(data: any, options?: any): Promise<any>;
    static defaultName(): string;
    static updateDocuments(updates: any[], context?: any): Promise<any[]>;
    static deleteDocuments(ids: string[], context?: any): Promise<any[]>;

    getFlag(scope: string, key: string): any;
    setFlag(scope: string, key: string, value: any): Promise<this>;
    unsetFlag(scope: string, key: string): Promise<this>;
    update(data: any, context?: any): Promise<this>;
    delete(context?: any): Promise<this>;
    toObject(source?: boolean): any;
    createEmbeddedDocuments(type: string, data: any[], context?: any): Promise<any[]>;
    updateEmbeddedDocuments(type: string, data: any[], context?: any): Promise<any[]>;
    deleteEmbeddedDocuments(type: string, ids: string[], context?: any): Promise<any[]>;
    getEmbeddedDocument(type: string, id: string, strict?: boolean): any;
    getEmbeddedCollection(type: string): Collection<any>;
    render(force?: boolean, options?: any): void;

    testUserPermission(user: User, permission: string | number, options?: any): boolean;
    _preCreate(data: any, options: any, user: any): Promise<void>;
    _onCreate(data: any, options: any, user: any): Promise<void>;
}

// ---- Document Classes ----

/** Actor document */
declare class Actor extends FoundryDocument {
    items: Collection<Item>;
    effects: Collection<ActiveEffect>;
    itemTypes: Record<string, Item[]>;
    hasPlayerOwner: boolean;
    isOwner: boolean;
    isToken: boolean;
    token: TokenDocument;
    prototypeToken: any;
    sheet: ActorSheet;
    actions: any[];

    /** Yield all applicable ActiveEffects including from items */
    allApplicableEffects(): Iterable<ActiveEffect>;
    applyActiveEffects(phase?: any): void;
    getActiveTokens(linked?: boolean, document?: boolean): Token[];
    prepareData(): void;
    prepareBaseData(): void;
    prepareDerivedData(): void | Promise<void>;
    getRollData(): any;

    /** Toggle a status effect (v14 replaces the old toggleEffect API) */
    toggleStatusEffect(
        statusId: string,
        options?: { overlay?: boolean; active?: boolean }
    ): Promise<ActiveEffect | boolean | undefined>;

    static create(data: any, options?: any): Promise<Actor>;
    static implementation: typeof Actor;
}

/** Item document */
declare class Item extends FoundryDocument {
    actor: Actor | null;
    effects: Collection<ActiveEffect>;
    img: string;
    description: string;
    data: any;

    static create(data: any, options?: any): Promise<Item>;
    static createDialog(data?: any, options?: any): Promise<Item | null>;
    static fromDropData(data: any): Promise<Item>;
    static implementation: typeof Item;

    roll(options?: any): Promise<any>;
    toDragData(): any;
    prepareData(): void;
    prepareBaseData(): void;
    prepareDerivedData(): void;
}

/** ActiveEffect document */
declare class ActiveEffect extends FoundryDocument {
    label: string;
    origin: string;
    statuses: Set<string>;
    target: Actor;
    /** Whether the effect is currently active (not disabled, not suppressed) */
    active: boolean;
    disabled: boolean;
    /** Array of attribute changes this effect applies */
    changes: ActiveEffectChange[];
    icon: string;
    duration: any;
    toDragData(): any;
    toObject(): Record<string, unknown>;
    static implementation: typeof ActiveEffect;
    static fromDropData(data: unknown): Promise<ActiveEffect | undefined>;
}

interface ActiveEffectChange {
    key: string;
    value: any;
    mode: number;
    type: string;
    priority: number;
}

/** ChatMessage document */
declare class ChatMessage extends FoundryDocument {
    speaker: ChatSpeaker;
    rolls: Roll[];
    sound: string | null;
    whisper: string[];
    blind: boolean;
    author: User;
    content: string;
    isContentVisible: boolean;

    static getSpeaker(options?: any): ChatSpeaker;
    static create(data: any, options?: any): Promise<ChatMessage>;

    clone(data?: any, context?: any): ChatMessage;
    getRollData(): any;
}

/** Combat document */
declare class Combat extends FoundryDocument {
    round: number;
    turn: number;
    active: boolean;
    started: boolean;
    scene: Scene | null;
    combatants: Collection<Combatant>;
    combatant: Combatant;
    turns: Combatant[];
    settings: { skipDefeated: boolean; [key: string]: any };
    current: any;

    nextRound(): Promise<this>;
    previousRound(): Promise<this>;
    nextTurn(): Promise<this>;
    previousTurn(): Promise<this>;
    rollInitiative(ids: string | string[], options?: any): Promise<this>;
    startCombat(): Promise<this>;
}

/** Combatant document */
declare class Combatant extends FoundryDocument {
    actor: Actor;
    token: TokenDocument;
    hasPlayerOwner: boolean;
    initiative: number | null;
    hidden: boolean;
    isDefeated: boolean;
}

/** Scene document */
declare class Scene extends FoundryDocument {
    tokens: Collection<TokenDocument>;
    regions: Collection<RegionDocument>;
    dimensions: any;
    grid: { distance: number; size: number; type: number; [key: string]: any };

    getEmbeddedDocument(type: string, id: string): any;
    createEmbeddedDocuments(type: string, data: any[], context?: any): Promise<any[]>;
    deleteEmbeddedDocuments(type: string, ids: string[], context?: any): Promise<any[]>;
}

/** TokenDocument — the data layer for a placed token */
declare class TokenDocument extends FoundryDocument {
    actor: Actor;
    object: Token;
    disposition: number;
}

/** User document */
declare class User extends FoundryDocument {
    isGM: boolean;
    active: boolean;
    character: Actor | null;
    assignHotbarMacro(macro: Macro, slot: number): Promise<void>;
}

/** Macro document */
declare class Macro extends FoundryDocument {
    command: string;
    static create(data: any): Promise<Macro>;
}

/** Compendium pack (subset of CompendiumCollection used by OD6S code). */
interface CompendiumPack {
    metadata: {
        packageName: string;
        name: string;
        label: string;
        type: string;
    };
    documentName: string;
    index: Collection<{ _id: string; name: string; type: string }>;
    getIndex(): Promise<Collection<{ _id: string; name: string; type: string }>>;
    getDocument(id: string): Promise<FoundryDocument | null>;
    _formatFolderSelectOptions(): Array<{value: string; label: string}>;
}

/** Folder document */
declare class Folder extends FoundryDocument {
    type: string;
    displayed: boolean;
    children: Array<Folder | { folder: Folder; depth?: number; root?: boolean }>;
    contents?: FoundryDocument[];
    static implementation: typeof Folder;
    static fromDropData(data: unknown): Promise<Folder | undefined>;
}

// ---- Region (v14 - replaces MeasuredTemplate) ----

declare class RegionDocument extends FoundryDocument {
    shapes: RegionShape[];
    behaviors: Collection<RegionBehavior>;
    static create(data: any, context?: any): Promise<RegionDocument>;
}

declare class RegionBehavior extends FoundryDocument {
    static defineSchema(): Record<string, any>;
}

interface RegionShape {
    type: string;
    x: number;
    y: number;
    radiusX?: number;
    radius?: number;
    [key: string]: any;
}

// ---- Application v1 Sheet Classes ----

/**
 * ActorSheet — Application v1 base class for actor sheets.
 * OD6SActorSheet extends this directly.
 */
declare class ActorSheet {
    actor: Actor;
    document: Actor;
    token: any;
    element: JQuery;
    options: any;
    rendered: boolean;
    form: HTMLFormElement | null;
    isEditable: boolean;

    static get defaultOptions(): any;
    get template(): string;

    render(force?: boolean, options?: any): this;
    close(options?: any): Promise<void>;
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    setPosition(options?: any): any;
    getData(options?: any): any;
    activateListeners(html: JQuery): void;
    _render(force?: boolean, options?: any): Promise<void>;
    _getHeaderButtons(): any[];

    _onDrop(event: DragEvent): void;
    _onDropItem(event: DragEvent, data: any): Promise<any>;
    _onDropActor(event: DragEvent, data: any): Promise<any>;
    _onDropFolder(event: DragEvent, data: any): Promise<any>;
    _onSortItem(event: DragEvent, itemData: any): Promise<any>;

    [key: string]: any;
}

/**
 * ItemSheet — Application v1 base class for item sheets.
 * OD6SItemSheet extends this directly.
 */
declare class ItemSheet {
    item: Item;
    document: Item;
    element: JQuery;
    options: any;
    rendered: boolean;
    form: HTMLFormElement | null;
    isEditable: boolean;

    static get defaultOptions(): any;
    get template(): string;

    render(force?: boolean, options?: any): this;
    close(options?: any): Promise<void>;
    setPosition(options?: any): any;
    getData(options?: any): any;
    activateListeners(html: JQuery): void;
    _render(force?: boolean, options?: any): Promise<void>;

    [key: string]: any;
}

/** ActiveEffectConfig dialog */
declare class ActiveEffectConfig {
    constructor(effect: ActiveEffect, options?: any);
    render(force?: boolean): this;
}

// ---- Roll and Dice ----

/** Roll expression evaluator */
declare class Roll {
    total: number;
    terms: DiceTerm[];
    dice: DiceTerm[];
    formula: string;
    result: string;

    constructor(formula: string, data?: any);

    /** Asynchronous evaluation */
    evaluate(options?: any): Promise<Roll>;
    /** Synchronous evaluation (v14+) */
    evaluateSync(options?: any): Roll;
    /** Post the roll result as a ChatMessage */
    toMessage(data?: any, options?: any): Promise<ChatMessage>;
    toJSON(): any;
    render(): Promise<string>;

    static create(formula: string, data?: any): Roll;
}

/** Die — a specific dice term (e.g. d6, d20) */
declare class Die extends DiceTerm {
    static DENOMINATION: string;
    faces: number;
    number: number;
    modifiers: string[];
    constructor(termData?: DiceTermData);
}

/** Base class for dice terms */
declare class DiceTerm {
    total: number;
    results: DiceResult[];
    options: Record<string, any>;
    flavor: string;
    faces: number;
    number: number;
}

interface DiceTermData {
    faces?: number;
    number?: number;
    modifiers?: string[];
    options?: Record<string, any>;
}

interface DiceResult {
    result: number;
    active: boolean;
    discarded?: boolean;
}

// ---- Ray (used for explosive scatter) ----

declare class Ray {
    A: Point;
    B: Point;
    angle: number;
    distance: number;
    dx: number;
    dy: number;

    constructor(A: Point, B: Point);

    static fromAngle(x: number, y: number, angle: number, distance: number): Ray;
    static fromArrays(A: number[], B: number[]): Ray;
}

// ---- Dialog ----

declare class Dialog {
    constructor(data: DialogData, options?: any);
    data: any;
    form: HTMLFormElement | null;
    options: any;
    element: JQuery;
    rendered: boolean;

    static get defaultOptions(): any;
    static prompt(config: DialogPromptConfig): Promise<any>;
    static confirm(config: DialogConfirmConfig): Promise<boolean>;

    render(force?: boolean, options?: any): this;
    close(options?: any): Promise<void>;
    activateListeners(html: JQuery): void;
    setPosition(options?: any): any;
    getData(options?: any): any;
    _updateObject(event?: any, formData?: any): Promise<void>;

    [key: string]: any;
}

interface DialogData {
    title?: string;
    content?: string;
    buttons?: Record<string, DialogButton>;
    default?: string;
    close?: (html: JQuery) => void;
    render?: (html: JQuery) => void;
    width?: number;
    height?: number | string;
    [key: string]: any;
}

interface DialogButton {
    label?: string;
    callback?: (html: JQuery | any) => void;
    icon?: string;
}

interface DialogPromptConfig {
    title?: string;
    content?: string;
    label?: string;
    callback?: (html: JQuery | any) => any;
    render?: (html: JQuery) => void;
    rejectClose?: boolean;
    options?: any;
}

interface DialogConfirmConfig {
    title?: string;
    content?: string;
    yes?: (html: JQuery) => void;
    no?: (html: JQuery) => void;
    defaultYes?: boolean;
    rejectClose?: boolean;
    options?: any;
}

/**
 * FormApplication — Application v1 base for forms.
 * Many config dialogs extend this (config-*.ts, edit-*.ts, choose-target, etc.)
 */
declare class FormApplication {
    object: any;
    form: HTMLFormElement | null;
    options: any;
    element: JQuery;
    rendered: boolean;

    constructor(object?: any, options?: any);

    static get defaultOptions(): any;

    render(force?: boolean, options?: any): this;
    close(options?: any): Promise<void>;
    activateListeners(html: JQuery): void;
    getData(options?: any): any;
    setPosition(options?: any): any;
    _updateObject(event: any, formData: any): Promise<void>;
    _render(force?: boolean, options?: any): Promise<void>;

    [key: string]: any;
}

// ---- Collections ----

declare class Collection<T> extends Map<string, T> {
    contents: T[];
    find(predicate: (value: T) => boolean): T | undefined;
    filter(predicate: (value: T) => boolean): T[];
    get(key: string): T | undefined;
    getName(name: string): T | undefined;
    map<U>(fn: (value: T) => U): U[];
    reduce<U>(fn: (accumulator: U, value: T) => U, initial: U): U;
    some(predicate: (value: T) => boolean): boolean;
    every(predicate: (value: T) => boolean): boolean;
    render(force?: boolean): void;
    _formatFolderSelectOptions(): any[];

    /**
     * Foundry's Collection overrides Map's iterator to yield values directly,
     * not [key, value] entries. This makes `for (const x of collection)` work
     * the way every call site expects.
     */
    [Symbol.iterator](): IterableIterator<T>;

    [key: string]: any;
}

// ---- Game ----

/** The global `game` object, available after init */
interface Game {
    actors: Collection<Actor>;
    items: Collection<Item>;
    macros: Collection<Macro>;
    messages: Collection<ChatMessage>;
    scenes: GameScenes;
    combat: Combat | null;
    combats: GameCombats;
    users: Collection<User>;
    user: User;
    userId: string;
    settings: GameSettings;
    i18n: Localization;
    socket: GameSocket;
    "nonex-ist-od6s": any;
    system: GameSystem;
    version: string;
    packs: Collection<CompendiumPack>;
    folders: Collection<Folder>;
    collections: GameCollections;
    documentTypes: Record<string, string[]>;
    modules: GameModules;
    activeTool: string;
    keyboard: GameKeyboard;
    paused: boolean;
    /** Dice So Nice integration */
    dice3d: any;
    [key: string]: any;
}

/** game.scenes — a WorldCollection of Scene documents */
interface GameScenes extends Collection<Scene> {
    /** The currently viewed Scene */
    viewed: Scene;
    /** The currently active Scene */
    active: Scene;
    get(id: string): Scene | undefined;
}

/** game.combats — a WorldCollection of Combat documents */
interface GameCombats extends Collection<Combat> {
    /** The currently active Combat encounter */
    active: Combat;
}

interface GameCollections {
    get(documentName: string): Collection<any>;
}

interface GameModules {
    get(id: string): { active: boolean; [key: string]: any } | undefined;
}

interface GameKeyboard {
    isModifierActive(key: string): boolean;
    [key: string]: any;
}

interface GameSettings {
    get(module: string, key: string): any;
    set(module: string, key: string, value: any): Promise<any>;
    register(module: string, key: string, data: any): void;
    registerMenu(module: string, key: string, data: any): void;
    /** The full map of registered settings (key = "module.settingKey") */
    settings: Map<string, any>;
}

interface Localization {
    localize(key: string): string;
    format(key: string, data?: any): string;
    has(key: string): boolean;
    translations: Record<string, any>;
}

interface GameSocket {
    on(event: string, callback: (data: any) => void): void;
    emit(event: string, data: any): void;
}

interface GameSystem {
    id: string;
    version: string;
    /**
     * `template.json` — the legacy schema descriptor exposed by Foundry on
     * the GameSystem. Indexed by document type then sub-type, with a `label`
     * the system's templates and dialogs localize against.
     */
    template: {
        Actor: Record<string, { label: string; [key: string]: any }>;
        Item: Record<string, { label: string; [key: string]: any }>;
        [key: string]: any;
    };
}

// ---- Hooks ----

/** Global Hooks API for event-driven programming */
interface HooksAPI {
    on(hook: string, fn: (...args: any[]) => any): number;
    once(hook: string, fn: (...args: any[]) => any): number;
    off(hook: string, id: number): void;
    call(hook: string, ...args: any[]): boolean;
    callAll(hook: string, ...args: any[]): boolean;
}

// ---- Canvas ----

interface Canvas {
    scene: Scene;
    grid: CanvasGrid;
    stage: PIXI.Container;
    app: PIXI.Application;
    tokens: TokenLayer;
    activeLayer: CanvasLayer;
    templates?: any;
    regions: RegionLayer;
    /** Scene dimension data including distancePixels */
    dimensions: CanvasDimensions;
}

interface CanvasDimensions {
    /** Pixels per grid unit of distance */
    distancePixels: number;
    width: number;
    height: number;
    size: number;
    sceneWidth: number;
    sceneHeight: number;
    rect: any;
    [key: string]: any;
}

interface CanvasGrid {
    type: number;
    size: number;
    distance: number;
    measureDistance(origin: Point, target: Point, options?: any): number;
    measurePath(waypoints: Point[], options?: any): any;
    getSnappedPosition(x: number, y: number, interval?: number): Point;
    [key: string]: any;
}

interface TokenLayer {
    controlled: Token[];
    get(id: string): Token | undefined;
    placeables: Token[];
}

interface RegionLayer extends CanvasLayer {
    get(id: string): any;
}

interface CanvasLayer {
    activate(): void;
    preview: PIXI.Container;
    _onDragLeftCancel(event: any): void;
}

/** Token placeable object (the visual representation on the canvas) */
declare class Token {
    id: string;
    actor: Actor;
    center: Point;
    object: Token;
    controlled: boolean;
    _movement: any;
    x: number;
    y: number;
    w: number;
    h: number;
    width: number;
    height: number;
    name: string;
    isOwner: boolean;
    document: TokenDocument;

    toggleEffect(effect: any, options?: any): Promise<void>;
    _canDrag(user: User, event: any): boolean;

    [key: string]: any;
}

// ---- Chat ----

interface ChatSpeaker {
    actor: string;
    token: string;
    scene: string;
    alias: string;
}

// ---- Status Effects ----

interface StatusEffect {
    id: string;
    name: string;
    img: string;
    hud?: boolean;
    [key: string]: any;
}

// ---- UI ----

interface UI {
    notifications: Notifications;
    chat: any;
    combat: any;
    compendium: any;
    [key: string]: any;
}

interface Notifications {
    warn(message: string, options?: any): void;
    error(message: string, options?: any): void;
    info(message: string, options?: any): void;
}

// ---- Config ----

interface FoundryConfig {
    Actor: DocumentConfig;
    Item: DocumentConfig;
    Combat: CombatConfig;
    Token: TokenConfig;
    ChatMessage: ChatMessageConfig;
    Dice: DiceConfig;
    Canvas: CanvasConfig;
    Folder: FolderConfig;
    statusEffects: StatusEffect[];
    ui: UIConfig;
    debug: { hooks: boolean };
    time: TimeConfig;
    /** Index signature for dynamic access like CONFIG[documentName] */
    [key: string]: any;
}

interface DocumentConfig {
    documentClass: any;
    dataModels: Record<string, any>;
    typeLabels?: Record<string, string>;
    defaultType?: string;
    sidebarIcon?: string;
    [key: string]: any;
}

interface CombatConfig {
    documentClass: any;
    initiative: { formula: string; decimals: number };
}

interface TokenConfig {
    objectClass: any;
}

interface ChatMessageConfig {
    template: string;
}

interface DiceConfig {
    terms: Record<string, any>;
}

interface CanvasConfig {
    polygonBackends: Record<string, PolygonBackend>;
}

interface FolderConfig {
    sidebarIcon: string;
    [key: string]: any;
}

interface TimeConfig {
    turnTime: number;
    roundTime: number;
}

interface PolygonBackend {
    testCollision(origin: Point, destination: Point, options: any): any;
}

interface UIConfig {
    chat: any;
    combat: any;
    compendium: any;
}

// ---- Constants ----

interface FoundryConstants {
    GRID_TYPES: { GRIDLESS: number; SQUARE: number; [key: string]: number };
    DICE_ROLL_MODES: { PRIVATE: string; PUBLIC: string; BLIND: string; SELF: string };
    TOKEN_DISPLAY_MODES: { NONE: number; CONTROL: number; OWNER_HOVER: number; HOVER: number; OWNER: number; ALWAYS: number; [key: string]: number };
    DOCUMENT_OWNERSHIP_LEVELS: { NONE: number; LIMITED: number; OBSERVER: number; OWNER: number; [key: string]: number };
    BASE_DOCUMENT_TYPE: string;
    DEFAULT_TOKEN: string;
    ACTIVE_EFFECT_MODES: { CUSTOM: number; MULTIPLY: number; ADD: number; DOWNGRADE: number; UPGRADE: number; OVERRIDE: number; [key: string]: number };
    [key: string]: any;
}

// ---- PIXI (minimal stubs) ----

declare namespace PIXI {
    class Container {
        addChild(child: any): void;
        removeChild(child: any): void;
        children: any[];
        destroy(options?: any): void;
        on(event: string, handler: (...args: any[]) => void): this;
        off(event: string, handler: (...args: any[]) => void): this;
    }
    /** Federated pointer/wheel/etc event delivered by the PIXI display tree. */
    interface FederatedEvent {
        data: { getLocalPosition(parent: Container): { x: number; y: number } };
        stopPropagation(): void;
        preventDefault(): void;
        currentTarget: unknown;
        target: unknown;
    }
    class Application {
        view: HTMLCanvasElement;
    }
    class Graphics extends Container {
        clear(): Graphics;
        lineStyle(width: number, color: number, alpha?: number): Graphics;
        beginFill(color: number, alpha?: number): Graphics;
        endFill(): Graphics;
        drawCircle(x: number, y: number, radius: number): Graphics;
        drawRect(x: number, y: number, width: number, height: number): Graphics;
        moveTo(x: number, y: number): Graphics;
        lineTo(x: number, y: number): Graphics;
        position: { set(x: number, y: number): void; x: number; y: number };
        alpha: number;
        visible: boolean;
    }
    class Text {
        constructor(options: { text: string; style?: any } | string, style?: any);
        x: number;
        y: number;
        text: string;
        style: any;
        anchor: { set(x: number, y: number): void };
        destroy(options?: any): void;
    }
    class Sprite extends Container {
        static from(source: any): Sprite;
        anchor: { set(x: number, y: number): void };
        x: number;
        y: number;
        width: number;
        height: number;
        alpha: number;
    }
}

// ---- Utility types ----

interface Point {
    x: number;
    y: number;
}

interface FormDataExtended {
    object: Record<string, any>;
    toObject(): Record<string, any>;
}

/** Constructor for FormDataExtended from a form element */
declare var FormDataExtended: {
    new (form: HTMLFormElement): FormDataExtended;
};

// ---- jQuery (for v1 Application migration period) ----

interface JQuery<TElement = HTMLElement> {
    find(selector: string): JQuery;
    on(events: string, handler: (event: any) => void): JQuery;
    on(events: string, selector: string, handler: (event: any) => void): JQuery;
    change(handler: (event: any) => void): JQuery;
    click(handler: (event: any) => void): JQuery;
    hide(): JQuery;
    show(): JQuery;
    val(): string;
    val(value: string | number): JQuery;
    text(): string;
    text(value: string): JQuery;
    html(): string;
    html(value: string): JQuery;
    css(property: string, value?: string | number): any;
    attr(name: string): string | undefined;
    attr(name: string, value: string | number): JQuery;
    prop(name: string): any;
    prop(name: string, value: any): JQuery;
    each(fn: (index: number, element: HTMLElement) => void): JQuery;
    closest(selector: string): JQuery;
    parent(selector?: string): JQuery;
    parents(selector?: string): JQuery;
    children(selector?: string): JQuery;
    addClass(className: string): JQuery;
    removeClass(className: string): JQuery;
    toggleClass(className: string): JQuery;
    hasClass(className: string): boolean;
    remove(): JQuery;
    append(content: string | HTMLElement | JQuery): JQuery;
    prepend(content: string | HTMLElement | JQuery): JQuery;
    data(key: string): any;
    data(key: string, value: any): JQuery;
    length: number;
    [index: number]: TElement;
    style?: any;
}

declare function $(selector: string | HTMLElement | HTMLElement[] | Document): JQuery;

// ---- SocketLib ----

interface SocketLib {
    registerSystem(systemId: string): SocketLibSocket;
}

interface SocketLibSocket {
    register(name: string, handler: (...args: any[]) => any): void;
    executeAsGM(name: string, ...args: any[]): Promise<any>;
    executeForOthers(name: string, ...args: any[]): Promise<any>;
    executeForEveryone(name: string, ...args: any[]): Promise<any>;
}

// ---- Babele ----

interface BabeleAPI {
    get(): { setSystemTranslationsDir(path: string): void };
}
