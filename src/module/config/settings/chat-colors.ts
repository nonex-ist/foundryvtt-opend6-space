type ChatColorKey = 'public' | 'self' | 'gm' | 'blind';

const SETTING_BY_KEY: Record<ChatColorKey, string> = {
    public: 'chat_color_public',
    self:   'chat_color_self',
    gm:     'chat_color_gm',
    blind:  'chat_color_blind',
};

const DEFAULTS: Record<ChatColorKey, string> = {
    public: '#c9a227', // gold accent
    self:   '#4fb6c4', // cool teal
    gm:     '#7a6dc4', // muted purple
    blind:  '#8a93a6', // slate grey (per accessibility request)
};

const OPACITY_KEY = 'chat_background_opacity';

const HEX = /^#[0-9a-fA-F]{6}$/;

function applyOne(key: ChatColorKey, value: unknown) {
    const raw = typeof value === 'string' && HEX.test(value) ? value : DEFAULTS[key];
    document.documentElement.style.setProperty(`--nonex-ist-od6s-chat-color-${key}`, raw);
}

function applyOpacity(value: unknown) {
    const clamped = typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.min(2, value))
        : 1;
    document.documentElement.style.setProperty('--nonex-ist-od6s-chat-opacity', String(clamped));
}

export function applyChatColors() {
    (Object.keys(SETTING_BY_KEY) as ChatColorKey[]).forEach(k => {
        applyOne(k, game.settings.get('nonex-ist-od6s', SETTING_BY_KEY[k]));
    });
    applyOpacity(game.settings.get('nonex-ist-od6s', OPACITY_KEY));
}

export function registerChatColorSettings() {
    (Object.keys(SETTING_BY_KEY) as ChatColorKey[]).forEach(k => {
        game.settings.register('nonex-ist-od6s', SETTING_BY_KEY[k], {
            name: game.i18n.localize(`NONEX_IST_OD6S.CONFIG_CHAT_COLOR_${k.toUpperCase()}`),
            hint: game.i18n.localize(`NONEX_IST_OD6S.CONFIG_CHAT_COLOR_${k.toUpperCase()}_DESCRIPTION`),
            scope: 'client',
            config: false,
            od6sAppearance: true,
            type: String,
            default: DEFAULTS[k],
            onChange: (value: string) => applyOne(k, value),
        });
    });

    game.settings.register('nonex-ist-od6s', OPACITY_KEY, {
        name: game.i18n.localize('NONEX_IST_OD6S.CONFIG_CHAT_BACKGROUND_OPACITY'),
        hint: game.i18n.localize('NONEX_IST_OD6S.CONFIG_CHAT_BACKGROUND_OPACITY_DESCRIPTION'),
        scope: 'client',
        config: false,
        od6sAppearance: true,
        type: Number,
        default: 1,
        range: {min: 0, max: 2, step: 0.05},
        onChange: (value: number) => applyOpacity(value),
    });

    applyChatColors();
}
