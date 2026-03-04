export function defenseTooltip(combatant) {
  const actor = combatant?.actor;
  const token = combatant?.token;
  if (!actor) return "";

  const title = token?.name ?? actor.name ?? "";
  const lines = [`<h4>${title}</h4>`].concat(
    ["physical", "fortitude", "willpower", "reflex"].map((type) => {
      const value = actor.defenses[type];
      const name = game.i18n.localize(`DEFENSES.${type.capitalize()}`);
      return `${name}: ${value.total}`;
    })
  );
  const stride = game.i18n.localize("ACTOR.FIELDS.movement.stride.label");
  const engage = game.i18n.localize("ACTOR.FIELDS.movement.engagement.labelShort");
  lines.push(`${stride}: ${actor.system.movement.stride}`);
  lines.push(`${engage}: ${actor.system.movement.engagement}`);

  return lines.join("<br>");
}