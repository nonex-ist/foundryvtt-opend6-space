import { attributesSchema } from "./fields/attributes";
import { commonSchema } from "./fields/common";
import { migrateCustomFieldSlots } from "./custom-fields-migration";

const fields = foundry.data.fields;

export default class NPCData extends foundry.abstract.TypeDataModel {
  static migrateData(source: Record<string, unknown>) {
    migrateCustomFieldSlots(source);
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      ...attributesSchema(),
      ...commonSchema(),
      description: new fields.SchemaField({
        type: new fields.StringField({ initial: "String" }),
        label: new fields.StringField({ initial: "NONEX_IST_OD6S.DESCRIPTION" }),
        content: new fields.HTMLField({ initial: "" }),
      }),
      fatepoints: new fields.SchemaField({
        type: new fields.StringField({ initial: "Number" }),
        label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_FATE_POINTS" }),
        short_label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_FATE_POINTS_SHORT" }),
        value: new fields.NumberField({ initial: 0, integer: true }),
      }),
      characterpoints: new fields.SchemaField({
        type: new fields.StringField({ initial: "Number" }),
        label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_CHAR_POINTS" }),
        short_label: new fields.StringField({ initial: "NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT" }),
        value: new fields.NumberField({ initial: 0, integer: true }),
      }),
      vehicle: new fields.ObjectField({ initial: {} }),
    };
  }
}
