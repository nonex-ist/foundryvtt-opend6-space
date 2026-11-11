/** Minimal sheet handle the explosive preview minimises/restores. */
interface MinimisableSheet {
    minimize(): unknown;
    maximize(): unknown;
}

/** Bound mouse handlers for the placement preview. */
interface PreviewEventHandlers {
    cancel: (event: MouseEvent) => unknown;
    confirm: (event: PIXI.FederatedEvent) => unknown;
    move: (event: PIXI.FederatedEvent) => unknown;
    resolve: (regions: unknown[]) => void;
    reject: () => void;
}

/** Payload passed to `setExplosiveData` — only the actor reference is read here. */
interface ExplosiveData {
    actor: { sheet?: MinimisableSheet | null };
    [key: string]: unknown;
}

/**
 * Handles the preview and placement of explosive blast regions on the canvas.
 * Replaces the old MeasuredTemplate-based system with Scene Regions (Foundry v14).
 */
export default class ExplosivesTemplate {

    /** Throttle timestamp for mouse movement */
    #moveTime = 0;

    /** The initially active layer to restore */
    #initialLayer: CanvasLayer | undefined;

    /** Bound event handlers */
    #events!: PreviewEventHandlers;

    /** Preview circle */
    #circle!: PIXI.Graphics;

    /** Range line from origin to target */
    #rangeLine!: PIXI.Graphics;

    /** Distance measurement display */
    #rangeMeasure!: PIXI.Text;

    /** Container for all preview graphics */
    #container!: PIXI.Container;

    /** Explosive data from the dialog */
    exData!: ExplosiveData;

    /** Actor sheet reference */
    actorSheet: MinimisableSheet | null | undefined;

    /** Origin X position */
    originX = 0;

    /** Origin Y position */
    originY = 0;

    /** Blast radius in grid units */
    radius: number;

    /** Current preview X position */
    previewX = 0;

    /** Current preview Y position */
    previewY = 0;

    /** Whether the preview position has a wall collision */
    _preview = false;

    constructor(radius: number) {
        this.radius = radius;
    }

    async setExplosiveData(data: ExplosiveData, x: number, y: number) {
        this.exData = data;
        this.actorSheet = this.exData.actor.sheet;
        this.originX = x;
        this.originY = y;
        this.previewX = x;
        this.previewY = y;
    }

    /**
     * Creates a preview of the blast radius on the canvas.
     * @returns {Promise<RegionDocument[]>} Resolves with created region documents, or rejects on cancel.
     */
    async drawPreview() {
        this.#initialLayer = canvas.activeLayer;

        // Create PIXI graphics for the preview
        this.#container = new PIXI.Container();
        this.#circle = new PIXI.Graphics();
        this.#rangeLine = new PIXI.Graphics();
        this.#rangeMeasure = new PIXI.Text({ text: `0 ${game.i18n.localize("NONEX_IST_OD6S.METERS_SHORT")}` });

        this.#container.addChild(this.#circle);
        this.#container.addChild(this.#rangeLine);
        this.#container.addChild(this.#rangeMeasure);

        canvas.stage.addChild(this.#container);

        // Draw initial circle
        this.#drawCircle(this.previewX, this.previewY);

        // Hide the sheet that originated the preview
        this.actorSheet?.minimize();

        return this.#activatePreviewListeners();
    }

    /**
     * Draw the blast radius circle at the given position.
     */
    #drawCircle(x: number, y: number) {
        const radiusPixels = this.radius * canvas.dimensions.distancePixels;
        this.#circle.clear();
        this.#circle.lineStyle(2, 0xFFFF00, 0.8);
        this.#circle.beginFill(0xFFFF00, 0.15);
        this.#circle.drawCircle(x, y, radiusPixels);
        this.#circle.endFill();
    }

    /**
     * Activate canvas listeners for placement preview.
     * @returns {Promise<RegionDocument[]>}
     */
    #activatePreviewListeners() {
        return new Promise<unknown[]>((resolve, reject) => {
            this.#events = {
                cancel: this.#onCancelPlacement.bind(this),
                confirm: this.#onConfirmPlacement.bind(this),
                move: this.#onMovePlacement.bind(this),
                resolve,
                reject,
            };

            canvas.stage.on("mousemove", this.#events.move);
            canvas.stage.on("mousedown", this.#events.confirm);
            canvas.app.view.oncontextmenu = this.#events.cancel as (e: MouseEvent) => unknown;
        });
    }

    /**
     * Clean up preview graphics and listeners.
     */
    async #finishPlacement() {
        canvas.stage.removeChild(this.#container);
        this.#container.destroy({ children: true });
        canvas.stage.off("mousemove", this.#events.move);
        canvas.stage.off("mousedown", this.#events.confirm);
        canvas.app.view.oncontextmenu = null;
        this.#initialLayer?.activate();
        await this.actorSheet?.maximize();
    }

    /**
     * Handle mouse movement during placement.
     */
    #onMovePlacement(event: PIXI.FederatedEvent) {
        event.stopPropagation();
        const now = Date.now();
        if (now - this.#moveTime <= 20) return;
        this.#moveTime = now;

        const center = event.data.getLocalPosition(canvas.stage);
        const snapped = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS
            ? { x: center.x, y: center.y }
            : canvas.grid.getSnappedPoint({ x: center.x, y: center.y }, { mode: CONST.GRID_SNAPPING_MODES.CENTER, resolution: 1 });

        this.previewX = snapped.x;
        this.previewY = snapped.y;

        // Redraw circle at new position
        this.#drawCircle(this.previewX, this.previewY);

        // Draw range line
        const distance = Math.floor(canvas.grid.measurePath([
            { x: this.originX, y: this.originY },
            { x: this.previewX, y: this.previewY },
        ]).distance);

        this.#rangeLine.clear();
        this.#rangeLine.lineStyle(4, 0xffd900, 1);
        this.#rangeLine.moveTo(this.originX, this.originY);
        this.#rangeLine.lineTo(this.previewX, this.previewY);

        this.#rangeMeasure.x = this.previewX - 30;
        this.#rangeMeasure.y = this.previewY + 60;
        this.#rangeMeasure.style.fill = 0xFFFFFF;
        this.#rangeMeasure.text = `${distance} ${game.i18n.localize("NONEX_IST_OD6S.METERS_SHORT")}`;

        // Check wall collision
        const origin = { x: this.originX, y: this.originY };
        const target = { x: this.previewX, y: this.previewY };
        this._preview = !!(
            CONFIG.Canvas.polygonBackends.move.testCollision(origin, target, { type: "move", mode: "any" }) ||
            CONFIG.Canvas.polygonBackends.sight.testCollision(origin, target, { type: "sight", mode: "any" })
        );
    }

    /**
     * Confirm placement and create a Region document.
     */
    async #onConfirmPlacement(_event: PIXI.FederatedEvent) {
        // Block placement through walls
        const origin = { x: this.originX, y: this.originY };
        const target = { x: this.previewX, y: this.previewY };
        if (
            CONFIG.Canvas.polygonBackends.move.testCollision(origin, target, { type: "move", mode: "any" }) ||
            CONFIG.Canvas.polygonBackends.sight.testCollision(origin, target, { type: "sight", mode: "any" })
        ) return;

        await this.#finishPlacement();

        const snapped = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS
            ? { x: this.previewX, y: this.previewY }
            : canvas.grid.getSnappedPoint({ x: this.previewX, y: this.previewY }, { mode: CONST.GRID_SNAPPING_MODES.CENTER, resolution: 1 });

        const radiusPixels = this.radius * canvas.dimensions.distancePixels;

        // Create a Region document with a circular shape
        const regionData = {
            name: game.i18n.localize("NONEX_IST_OD6S.EXPLOSIVE"),
            visibility: 1, // GM only initially
            shapes: [{
                type: "ellipse",
                x: snapped.x,
                y: snapped.y,
                radiusX: radiusPixels,
                radiusY: radiusPixels,
            }],
            flags: {
                "nonex-ist-od6s": {
                    explosive: true,
                },
            },
        };

        const regions = await canvas.scene.createEmbeddedDocuments("Region", [regionData]);
        this.#events.resolve(regions);
    }

    /**
     * Cancel placement on right-click.
     */
    async #onCancelPlacement(_event: MouseEvent) {
        await this.#finishPlacement();
        this.#events.reject();
    }
}
