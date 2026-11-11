/**
 * Shared vehicle_common schema fields used by vehicle and starship actors.
 */

import { schemaVersionField } from "../../fields/schema-version";

const fields = foundry.data.fields;

function numScoreField(label: string) {
  return new fields.SchemaField({
    score: new fields.NumberField({ initial: 0 }),
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
  });
}

function numValueField(label: string) {
  return new fields.SchemaField({
    value: new fields.NumberField({ initial: 0 }),
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
  });
}

function strValueField(label: string, initial = "") {
  return new fields.SchemaField({
    value: new fields.StringField({ initial }),
    type: new fields.StringField({ initial: "String" }),
    label: new fields.StringField({ initial: label }),
  });
}

function rangedStatField(label: string, shortLabel: string) {
  return new fields.SchemaField({
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
    short_label: new fields.StringField({ initial: shortLabel }),
    score: new fields.NumberField({ initial: 0 }),
  });
}

function sensorTypeField(label: any) {
  return new fields.SchemaField({
    score: new fields.NumberField({ initial: 0 }),
    range: new fields.NumberField({ initial: 0 }),
    label: new fields.StringField({ initial: label }),
    type: new fields.StringField({ initial: "Number" }),
  });
}

function shieldArcField(label: any) {
  return new fields.SchemaField({
    label: new fields.StringField({ initial: label }),
    value: new fields.NumberField({ initial: 0 }),
    type: new fields.StringField({ initial: "Number" }),
  });
}

export function vehicleCommonSchema() {
  return {
    ...schemaVersionField(),
    vehicle_type: strValueField("NONEX_IST_OD6S.VEHICLE_TYPE"),
    initiative: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.INITIATIVE" }),
      formula: new fields.StringField({ initial: "" }),
      mod: new fields.NumberField({ initial: 0 }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    damage: strValueField("NONEX_IST_OD6S.DAMAGE", "NONEX_IST_OD6S.NO_DAMAGE"),
    scale: new fields.SchemaField({
      score: new fields.NumberField({ initial: 3 }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.SCALE" }),
    }),
    maneuverability: numScoreField("NONEX_IST_OD6S.MANEUVERABILITY"),
    toughness: numScoreField("NONEX_IST_OD6S.TOUGHNESS"),
    armor: numScoreField("NONEX_IST_OD6S.ARMOR"),
    move: numValueField("NONEX_IST_OD6S.MOVE"),
    cargo_capacity: numValueField("NONEX_IST_OD6S.CARGO_CAPACITY"),
    cost: numValueField("NONEX_IST_OD6S.COST"),
    price: strValueField("NONEX_IST_OD6S.PRICE"),
    crew: new fields.SchemaField({
      value: new fields.NumberField({ initial: 1, integer: true }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.CREW" }),
    }),
    crewmembers: new fields.ArrayField(new fields.ObjectField()),
    passengers: new fields.SchemaField({
      value: new fields.NumberField({ initial: 0, integer: true }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.PASSENGERS" }),
    }),
    skill: strValueField("NONEX_IST_OD6S.SKILL"),
    specialization: strValueField("NONEX_IST_OD6S.SPECIALIZATION"),
    attribute: strValueField("NONEX_IST_OD6S.ATTRIBUTE", "mec"),
    dodge: new fields.SchemaField({
      score: new fields.NumberField({ initial: 0 }),
      mod: new fields.NumberField({ initial: 0 }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.DODGE" }),
    }),
    sensors: new fields.SchemaField({
      value: new fields.BooleanField({ initial: false }),
      type: new fields.StringField({ initial: "Boolean" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.SENSORS" }),
      skill: new fields.StringField({ initial: "Sensors" }),
      mod: new fields.NumberField({ initial: 0 }),
      types: new fields.SchemaField({
        passive: sensorTypeField("NONEX_IST_OD6S.SENSORS_PASSIVE"),
        scan: sensorTypeField("NONEX_IST_OD6S.SENSORS_SCAN"),
        search: sensorTypeField("NONEX_IST_OD6S.SENSORS_SEARCH"),
        focus: sensorTypeField("NONEX_IST_OD6S.SENSORS_FOCUS"),
      }),
    }),
    shields: new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      allocated: new fields.NumberField({ initial: 0 }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.SHIELDS" }),
      skill: new fields.StringField({ initial: "NONEX_IST_OD6S.SHIELDS" }),
      arcs: new fields.SchemaField({
        front: shieldArcField("NONEX_IST_OD6S.FRONT"),
        rear: shieldArcField("NONEX_IST_OD6S.REAR"),
        left: shieldArcField("NONEX_IST_OD6S.LEFT"),
        right: shieldArcField("NONEX_IST_OD6S.RIGHT"),
      }),
    }),
    ranged: rangedStatField("NONEX_IST_OD6S.RANGED_ATTACK_MOD", "NONEX_IST_OD6S.RANGED_ATTACK_MOD_SHORT"),
    ranged_damage: rangedStatField("NONEX_IST_OD6S.RANGED_DAMAGE_MOD", "NONEX_IST_OD6S.RANGED_DAMAGE_MOD_SHORT"),
    ram: rangedStatField("NONEX_IST_OD6S.RAM_ATTACK_MOD", "NONEX_IST_OD6S.RAM_ATTACK_MOD_SHORT"),
    ram_damage: rangedStatField("NONEX_IST_OD6S.RAM_DAMAGE_MOD", "NONEX_IST_OD6S.RAM_DAMAGE_MOD_SHORT"),
    length: numValueField("NONEX_IST_OD6S.LENGTH"),
    tonnage: numValueField("NONEX_IST_OD6S.TONNAGE"),
    embedded_pilot: new fields.SchemaField({
      value: new fields.BooleanField({ initial: false }),
      type: new fields.StringField({ initial: "Boolean" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.EMBEDDED_PILOT" }),
      actor: new fields.ObjectField({ initial: {} }),
    }),
    sheetmode: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "NONEX_IST_OD6S.SHEET_MODE" }),
      short_label: new fields.StringField({ initial: "NONEX_IST_OD6S.SHEET_MODE_SHORT" }),
      value: new fields.StringField({ initial: "normal" }),
    }),
    // World-defined header-field values, keyed by slot id from the
    // `custom_fields` setting (#199). The legacy fixed slots never existed on
    // vehicle/starship schemas even though their headers rendered the inputs,
    // so submitted values were silently dropped — this field closes that gap.
    customfields: new fields.ObjectField({ initial: {} }),
    roll_mod: new fields.NumberField({ initial: 0 }),
  };
}
