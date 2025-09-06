export class HotBarActor extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static AVATAR_RADIUS = 100;
    static WEAPON_RADIUS = 40;

    static DEFAULT_OPTIONS = {
        id: "actor-hud",
        actions: {

        },
        window: {
            frame: false,
        },
        classes: ['crucibletongs-actor-hud'],
    };

    static PARTS = {
        hud: {
            template: "modules/crucibletongs/templates/hud/hotbar-hud.hbs"
        }
    };

    setPosition(position) {
        //const ratio = canvas.dimensions.size / 100;
        const hotbar = ui.hotbar.element.getBoundingClientRect();
        const revised = {

            top: hotbar.top,
            left: hotbar.left,
        }

        return super.setPosition(revised);
    }

    #setActor() {
        const controlled = canvas.tokens.controlled;
        this.actor = controlled.length < 2 ? (controlled[0]?.actor ?? game.user.character) : null;

        if (this.actor && !this.actor?.isOwner) this.actor = null;
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        this.#setActor();

        this.prepareActorContext(context);
        context.inCombat = game.combat;
        return context;
    }

    prepareActorContext(context) {
        if (!this.actor) return context;

        context.actor = this.actor;
        context.resources = this.#prepareResources();
        context.defenseTooltip = this.#prepareDefenseTooltip();
        context.weapons = this.#weaponPositions();
    }

    #prepareDefenseTooltip() {
        return ['physical', 'fortitude', 'willpower', 'reflex'].map(type => {
            const value = this.actor.defenses[type];
            const name = game.i18n.localize(`DEFENSES.${type.capitalize()}`);
            return `${name}: ${value.total}`;
        }).join("<br>");
    }

    #weaponPositions() {
        const weaponPositions = [
            "left:-2px;top:75px;",
            "right:-2px;top:75px;",
            "left:-19px;top:40px;",
            "right:-19px;top:40px;",
            "left:-15px;top:5px;",
            "right:-15px;top:5px;",
        ];

        const positions = []
        const actorWeapons = this.actor.equipment.weapons;
        const isAnimal = actorWeapons.natural.length
        let position = 0;
        if (!isAnimal) {
            positions.push({
                weapon: actorWeapons.mainhand,
                style: weaponPositions[position++]
            });

            if (actorWeapons.mainhand.system.config.category.hands > 1) {
                positions.push({
                    weapon: actorWeapons.mainhand,
                    style: weaponPositions[position++]
                });
            } else {
                positions.push({
                    weapon: actorWeapons.offhand,
                    style: weaponPositions[position++]
                });
            }
        }

        if (!isAnimal) return positions;

        for (const weapon of actorWeapons.natural) {
            positions.push({
                weapon,
                style: weaponPositions[position++]
            });
            if (position >= weaponPositions.length) break;
        }
        for (const weapon of actorWeapons.natural) {
            positions.push({
                weapon,
                style: weaponPositions[position++]
            });
            if (position >= weaponPositions.length) break;
        }
        return positions;
    }

    #prepareResources() {
        const resources = {};
        const rs = this.actor.system.resources;

        // Pools
        for (const [id, resource] of Object.entries(rs)) {
            const r = foundry.utils.mergeObject(SYSTEM.RESOURCES[id], resource, { inplace: false });
            r.id = id;
            //r.pct = Math.round(r.value * 100 / r.max);
            //r.cssPct = `--resource-pct: ${100 - r.pct}%`;
            resources[r.id] = r;
        }

        // Action
        resources.action.pips = [];
        const maxAction = Math.min(resources.action.max, 6);
        for (let i = 1; i <= maxAction; i++) {
            const full = resources.action.value >= i;
            const double = (resources.action.value - 6) >= i;
            const cssClass = [full ? "full" : "", double ? "double" : ""].filterJoin(" ");
            resources.action.pips.push({ full, double, cssClass });
        }

        // Focus
        resources.focus.pips = [];
        const maxFocus = Math.min(resources.focus.max, 12);
        for (let i = 1; i <= maxFocus; i++) {
            const full = resources.focus.value >= i;
            const double = (resources.focus.value - 12) >= i;
            const cssClass = [full ? "full" : "", double ? "double" : ""].filterJoin(" ");
            resources.focus.pips.push({ full, double, cssClass });
        }

        // Heroism
        resources.heroism.pips = [];
        for (let i = 1; i <= 3; i++) {
            const full = resources.heroism.value >= i;
            const cssClass = full ? "full" : "";
            resources.heroism.pips.push({ full, double: false, cssClass });
        }
        return resources;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

    }

    static updateHotbar(actorId, force = false) {
        if (!game.settings.get("crucibletongs", "enableHotBarActor")) return;

        const instance = foundry.applications.instances.get(HotBarActor.DEFAULT_OPTIONS.id);

        if (!instance) {
            new HotBarActor().render(true, { focus: false });
        } else {
            if (actorId == instance.actor?.id || force) {
                instance.render(true, { focus: false });
            }
        }
    }
}