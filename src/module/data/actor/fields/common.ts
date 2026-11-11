/**
 * Shared "common" schema fields used by character, NPC, and creature actors.
 */

import { schemaVersionField } from "../../fields/schema-version";

const fields = foundry.data.fields;

function modField(label: string, shortLabel: string) {
  return new fields.SchemaField({
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
    short_label: new fields.StringField({ initial: shortLabel }),
    mod: new fields.NumberField({ initial: 0 }),
  });
}

function modScoreField(label: string, shortLabel: string) {
  return new fields.SchemaField({
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
    short_label: new fields.StringField({ initial: shortLabel }),
    mod: new fields.NumberField({ initial: 0 }),
    score: new fields.NumberField({ initial: 0 }),
  });
}

export function commonSchema() {
  return {
    ...schemaVersionField(),
    move: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_MOVE" }),
      mod: new fields.NumberField({ initial: 0 }),
      value: new fields.NumberField({ initial: 10 }),
    }),
    chartype: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_TYPE" }),
      content: new fields.StringField({ initial: "" }),
    }),
    species: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_SPECIES" }),
      content: new fields.StringField({ initial: "" }),
    }),
    wounds: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_HEALTH" }),
      short_label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_HEALTH" }),
      value: new fields.NumberField({ initial: 0, integer: true }),
      body_points: new fields.SchemaField({
        max: new fields.NumberField({ initial: 0 }),
        current: new fields.NumberField({ initial: 0 }),
      }),
    }),
    stuns: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_STUNS" }),
      value: new fields.NumberField({ initial: 0, integer: true }),
      current: new fields.NumberField({ initial: 0, integer: true }),
      rounds: new fields.NumberField({ initial: 0, integer: true }),
    }),
    strengthdamage: modScoreField("NONEX_IST_OD6S.STRENGTH_DAMAGE", "NONEX_IST_OD6S.STRENGTH_DAMAGE_SHORT"),
    ranged: modField("NONEX_IST_OD6S.RANGED_ATTACK_MOD", "NONEX_IST_OD6S.RANGED_ATTACK_MOD_SHORT"),
    melee: modField("NONEX_IST_OD6S.MELEE_ATTACK_MOD", "NONEX_IST_OD6S.MELEE_ATTACK_MOD_SHORT"),
    brawl: modField("NONEX_IST_OD6S.BRAWL_ATTACK_MOD", "NONEX_IST_OD6S.BRAWL_ATTACK_MOD_SHORT"),
    sheetmode: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.SHEET_MODE" }),
      short_label: new fields.StringField({ initial: "NONEX_IST_OD6S.SHEET_MODE_SHORT" }),
      value: new fields.StringField({ initial: "normal" }),
    }),
    dodge: modScoreField("NONEX_IST_OD6S.DODGE", "NONEX_IST_OD6S.DODGE_SHORT"),
    parry: modScoreField("NONEX_IST_OD6S.PARRY", "NONEX_IST_OD6S.PARRY_SHORT"),
    block: modScoreField("NONEX_IST_OD6S.BLOCK", "NONEX_IST_OD6S.BLOCK_SHORT"),
    pr: modScoreField("NONEX_IST_OD6S.PHYSICAL_RESISTANCE", "NONEX_IST_OD6S.PHYSICAL_RESISTANCE_SHORT"),
    er: modScoreField("NONEX_IST_OD6S.ENERGY_RESISTANCE", "NONEX_IST_OD6S.ENERGY_RESISTANCE_SHORT"),
    credits: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_CREDITS" }),
      value: new fields.NumberField({ initial: 0 }),
    }),
    funds: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_FUNDS" }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    initiative: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.INITIATIVE" }),
      formula: new fields.StringField({ initial: "" }),
      mod: new fields.NumberField({ initial: 0 }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    scale: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.SCALE" }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    customeffects: new fields.SchemaField({
      skills: new fields.ObjectField({ initial: {} }),
      specializations: new fields.ObjectField({ initial: {} }),
    }),
    // World-defined header-field values, keyed by slot id from the
    // `custom_fields` setting (#199). Values are strings or numbers depending
    // on the slot's configured type.
    customfields: new fields.ObjectField({ initial: {} }),
    labels: new fields.ObjectField({ initial: {} }),
    tags: new fields.ArrayField(new fields.StringField()),
    use_wild_die: new fields.BooleanField({ initial: true }),
    roll_mod: new fields.NumberField({ initial: 0 }),
  };
}
