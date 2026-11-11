/**
 * Shared attribute schema fields used by character, NPC, creature, vehicle, and starship actors.
 *
 * Besides the built-in attributes, one slot per world-defined custom attribute
 * (the `custom_attributes` setting, #199) is added at schema-build time. This
 * is safe because settings are registered at the top of `init`, before any
 * document schema is first accessed, and it is why adding or removing a custom
 * attribute requires a world reload: the schema is built once per session.
 * Removing a custom attribute drops its per-actor data the next time an actor
 * is saved (its key is no longer part of the schema).
 */

import { getSchemaCustomAttributes } from "../../../config/settings/custom-slots";

const fields = foundry.data.fields;

function attributeField(label: any, shortLabel: any, hasMinMax = true) {
  const schema = {
    label: new fields.StringField({ initial: label }),
    short_label: new fields.StringField({ initial: shortLabel }),
    base: new fields.NumberField({ initial: 0, integer: true }),
    mod: new fields.NumberField({ initial: 0, integer: true }),
    score: new fields.NumberField({ initial: 0 }),
    type: new fields.StringField({ initial: "Number" }),
  };
  if (hasMinMax) {
    (schema as any).max = new fields.NumberField({ initial: 15, integer: true });
    (schema as any).min = new fields.NumberField({ initial: 3, integer: true });
  }
  return new fields.SchemaField(schema);
}

export function attributesSchema() {
  const attributes: Record<string, ReturnType<typeof attributeField>> = {
    agi: attributeField("NONEX_IST_OD6S.CHAR_AGILITY", "NONEX_IST_OD6S.CHAR_AGILITY_SHORT"),
    str: attributeField("NONEX_IST_OD6S.CHAR_STRENGTH", "NONEX_IST_OD6S.CHAR_STRENGTH_SHORT"),
    mec: attributeField("NONEX_IST_OD6S.CHAR_MECHANICAL", "NONEX_IST_OD6S.CHAR_MECHANICAL_SHORT"),
    kno: attributeField("NONEX_IST_OD6S.CHAR_KNOWLEDGE", "NONEX_IST_OD6S.CHAR_KNOWLEDGE_SHORT"),
    per: attributeField("NONEX_IST_OD6S.CHAR_PERCEPTION", "NONEX_IST_OD6S.CHAR_PERCEPTION_SHORT"),
    tec: attributeField("NONEX_IST_OD6S.CHAR_TECHNICAL", "NONEX_IST_OD6S.CHAR_TECHNICAL_SHORT"),
    met: attributeField("NONEX_IST_OD6S.CHAR_METAPHYSICS", "NONEX_IST_OD6S.CHAR_METAPHYSICS_SHORT", false),
  };
  // The label initials are plain display strings, not i18n keys — {{localize}}
  // passes unknown keys through, and prepareBaseActorData overwrites labels
  // from the runtime registry on every prepare anyway.
  for (const def of getSchemaCustomAttributes()) {
    attributes[def.id] = attributeField(def.name, def.short || def.name, false);
  }
  return {
    attributes: new fields.SchemaField(attributes),
  };
}
