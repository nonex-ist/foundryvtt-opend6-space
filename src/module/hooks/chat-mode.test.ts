import { describe, it, expect } from 'vitest';
import { deriveRollMode } from './chat-mode';

describe('deriveRollMode', () => {
    it('classifies a public message (no whisper, not blind)', () => {
        expect(deriveRollMode({ whisper: [], author: { id: 'u1' } })).toBe('public');
    });

    it('classifies a blind roll regardless of whisper recipients', () => {
        // Blind rolls are typically also whispered to GMs; the blind flag wins.
        expect(deriveRollMode({ blind: true, whisper: ['gm1', 'gm2'], author: { id: 'u1' } })).toBe('blind');
        expect(deriveRollMode({ blind: true, whisper: [], author: { id: 'u1' } })).toBe('blind');
    });

    it('classifies a self-roll when the only recipient is the author', () => {
        expect(deriveRollMode({ whisper: ['u1'], author: { id: 'u1' } })).toBe('self');
    });

    it('classifies a GM-whisper when recipients are not just the author', () => {
        expect(deriveRollMode({ whisper: ['gm1'], author: { id: 'u1' } })).toBe('gm');
        expect(deriveRollMode({ whisper: ['u1', 'gm1'], author: { id: 'u1' } })).toBe('gm');
    });

    it('falls back to gm when author has no id (cannot prove self-roll)', () => {
        expect(deriveRollMode({ whisper: ['anyone'], author: null })).toBe('gm');
    });

    it('treats missing whisper field as public', () => {
        expect(deriveRollMode({ author: { id: 'u1' } })).toBe('public');
    });

    describe('persisted flag wins over derivation (single-GM disambiguation)', () => {
        // In a single-GM world, /gmroll from the only GM has whisper === [author.id]
        // — identical shape to /selfroll. Without the persisted flag we'd flip
        // gm rolls to self silently.
        it('classifies as gm when persisted flag says gmroll, even with whisper === [author.id]', () => {
            expect(deriveRollMode({
                whisper: ['gm1'],
                author: { id: 'gm1' },
                flags: { "nonex-ist-od6s": { rollMode: 'gmroll' } },
            })).toBe('gm');
        });

        it('classifies as self when persisted flag says selfroll', () => {
            expect(deriveRollMode({
                whisper: ['gm1'],
                author: { id: 'gm1' },
                flags: { "nonex-ist-od6s": { rollMode: 'selfroll' } },
            })).toBe('self');
        });

        it('classifies as blind when persisted flag says blindroll, even without msg.blind', () => {
            expect(deriveRollMode({
                whisper: ['gm1'],
                author: { id: 'gm1' },
                flags: { "nonex-ist-od6s": { rollMode: 'blindroll' } },
            })).toBe('blind');
        });

        it('classifies as public when persisted flag says publicroll, even with whisper recipients', () => {
            expect(deriveRollMode({
                whisper: ['gm1'],
                author: { id: 'u1' },
                flags: { "nonex-ist-od6s": { rollMode: 'publicroll' } },
            })).toBe('public');
        });

        it('falls back to derivation for unknown persisted values', () => {
            expect(deriveRollMode({
                whisper: [],
                author: { id: 'u1' },
                flags: { "nonex-ist-od6s": { rollMode: 'garbage' } },
            })).toBe('public');
        });

        // New messages persist the v14 messageMode value (gm/self/blind/public);
        // classification must honour it exactly like the legacy strings above.
        it('classifies new messageMode flag values (gm/self/blind/public)', () => {
            const base = { whisper: ['gm1'], author: { id: 'gm1' } };
            expect(deriveRollMode({ ...base, flags: { "nonex-ist-od6s": { rollMode: 'gm' } } })).toBe('gm');
            expect(deriveRollMode({ ...base, flags: { "nonex-ist-od6s": { rollMode: 'self' } } })).toBe('self');
            expect(deriveRollMode({ ...base, flags: { "nonex-ist-od6s": { rollMode: 'blind' } } })).toBe('blind');
            expect(deriveRollMode({
                whisper: ['gm1'],
                author: { id: 'u1' },
                flags: { "nonex-ist-od6s": { rollMode: 'public' } },
            })).toBe('public');
        });
    });
});
