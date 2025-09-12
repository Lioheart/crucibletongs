export class HotBarActor extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static AVATAR_RADIUS = 100;
    static WEAPON_RADIUS = 40;

    static DEFAULT_OPTIONS = {
        id: "actor-hud",
        actions: {
            action: this._onAction,
        },
        window: {
            frame: false,
        },
        classes: ['crucibletongs-actor-hud'],
    };

    static PARTS = {
        hud: {
            template: 'modules/crucibletongs/templates/hud/hotbar-hud.hbs',
            templates: ['modules/crucibletongs/templates/hud/actor-hud.hbs', 'modules/crucibletongs/templates/hud/actor-actions-hud.hbs']
        }
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: 'actions', label: 'crucibletongs.TABS.ACTIONS' },
                { id: 'talents', label: 'crucibletongs.TABS.TALENTS' },
                { id: 'macro', label: 'crucibletongs.TABS.MACRO' },
            ],
            initial: 'actions',
        },
    };

    static _onAction(event, target) {
        const { type, actionId } = target.dataset;
        switch (type) {
            case 'action':
                this.actor.useAction(actionId);
                break;
            case 'skill':
                this.actor.rollSkill(actionId, { dialog: true });
                break;
        }
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
        context.myTurn = context.inCombat && game.combat?.current?.combatantId === this.actor?.combatant?.id;
        return context;
    }

    prepareActorContext(context) {
        if (!this.actor) return context;

        context.actor = this.actor;
        context.resources = this.#prepareResources();
        context.defenseTooltip = this.#prepareDefenseTooltip();
        context.weapons = this.#weaponPositions();
        context.talents = this.#prepareSkills();
        context.effects = this.#prepareEffects();
        context.slots = ui.hotbar.slots;
    }

    #prepareEffects() {
        const effects = this.actor.temporaryEffects.map(eff => {
            return `<img class="flex0" src="${eff.img}" data-crucible-tooltip="activeeffect" data-uuid="${eff.uuid}" width=20 height=20/>`
        });
        return effects.join("");
    }

    #prepareDefenseTooltip() {
        const lines = ['physical', 'fortitude', 'willpower', 'reflex'].map(type => {
            const value = this.actor.defenses[type];
            const name = game.i18n.localize(`DEFENSES.${type.capitalize()}`);
            return `${name}: ${value.total}`;
        });
        const stride = game.i18n.localize('ACTOR.FIELDS.movement.stride.label');
        const engage = game.i18n.localize('ACTOR.FIELDS.movement.engagement.labelShort');
        lines.push(`${stride}: ${this.actor.system.movement.stride}`);
        lines.push(`${engage}: ${this.actor.system.movement.engagement}`);

        return lines.join("<br>");
    }

    #weaponPositions() {
        const weaponPositions = [
            "left:calc(50% - 72px);top:75px;",
            "left:calc(50% + 32px);top:75px;",
            "left:calc(50% - 88px);top:40px;",
            "left:calc(50% + 48px);top:40px;",
            "left:calc(50% - 83px);top:5px;",
            "left:calc(50% + 43px);top:5px;",
        ];

        const positions = [];
        const actorWeapons = this.actor.equipment.weapons;
        const isAnimal = actorWeapons.natural.length > 0;
        let positionIndex = 0;

        if (!isAnimal) {
            this.#addHumanoidWeapons(positions, actorWeapons, weaponPositions, positionIndex);
        } else {
            this.#addAnimalWeapons(positions, actorWeapons.natural, weaponPositions);
        }

        return positions;
    }

    #addHumanoidWeapons(positions, weapons, weaponPositions, startIndex) {
        let positionIndex = startIndex;

        positions.push({
            weapon: weapons.mainhand,
            style: weaponPositions[positionIndex++]
        });

        const isTwoHanded = weapons.mainhand.system.config.category.hands > 1;
        const secondWeapon = isTwoHanded ? weapons.mainhand : weapons.offhand;

        positions.push({
            weapon: secondWeapon,
            style: weaponPositions[positionIndex]
        });
    }

    #addAnimalWeapons(positions, naturalWeapons, weaponPositions) {
        let positionIndex = 0;

        for (const weapon of naturalWeapons) {
            if (positionIndex >= weaponPositions.length) break;

            positions.push({
                weapon,
                style: weaponPositions[positionIndex++]
            });
        }
    }

    #prepareSkills() {
        const skills = Object.entries(this.actor.skills || {});

        return skills.map(([id, skill], index) => {
            const baseSkill = SYSTEM.SKILL.SKILLS[id];
            return {
                img: baseSkill.icon,
                id,
                name: baseSkill.label
            };
        });
    }

    _insertElement(element) {
        const existing = document.getElementById(element.id);
        if (existing)
            existing.replaceWith(element);
        else
            ui.hotbar.element.insertAdjacentElement("beforebegin", element);
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

    async #showActiveEffectTooltip(event) {
        if (!("crucibleTooltip" in event.target.dataset)) return;
        if ("tooltipHtml" in event.target.dataset) return;
        const element = event.target;
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
        element.dataset.tooltipHtml = ""; // Placeholder to prevent double-activation

        const effect = await fromUuid(element.dataset.uuid);
        if (!effect) return;

        const tags = effect.statuses.reduce((acc, conditionId) => {
            const cfg = CONFIG.statusEffects.find(c => c.id === conditionId);
            if (cfg) acc[conditionId] = game.i18n.localize(cfg.name);
            return acc;
        }, {});
        const html = await foundry.applications.handlebars.renderTemplate("modules/crucibletongs/templates/tooltip/activeeffect.hbs", {
            tags,
            effect
        });
        element.dataset.tooltipHtml = await CONFIG.ux.TextEditor.enrichHTML(html);
        element.dataset.tooltipClass = "crucible crucible-tooltip";
        const pointerover = new event.constructor(event.type, event);
        element.dispatchEvent(pointerover);
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        this.element.querySelectorAll('[data-crucible-tooltip="activeeffect"]').forEach(el => {
            el.addEventListener('pointerover', this.#showActiveEffectTooltip.bind(this));
        });

        ui.hotbar.element.hidden = !!this.actor;
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

    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);

        new foundry.applications.ux.ContextMenu(this.element, '[data-action="weapon"]', [], {
            onOpen: this.#onWeaponContext.bind(this),
            jQuery: false,
            fixed: true,
            eventName: 'click'
        });
    }

    #onWeaponContext(target) {
        const { id } = target.dataset;
        const weapon = this.actor.items.get(id);

        ui.context.menuItems = this.#getWeaponContextOptions(weapon);
    }

    #getWeaponContextOptions(weapon) {
        const naturalWeapons = weapon?.system?.properties?.has("natural");
        if (naturalWeapons) return [];

        if (!weapon) {
            const options = [];
            for (const item of this.actor.items) {
                if (item.type !== 'weapon') continue;
                if (item.system.equipped) continue;
                if (item.system.properties.has("natural")) continue;

                options.push({
                    name: `${item.system.dropped ? 'Recover' : 'Equip'} ${item.name}`,
                    icon: `<i class='fa-solid ${item.system.dropped ? 'fa-hand-back-fist' : 'fa-shield-plus'}'></i>`,
                    callback: () => this.actor.equipItem(item.id, { equipped: true }),
                });
            }
            return options;
        }

        return [
            {
                name: `Drop ${weapon.name}`,
                icon: "<i class='fa-solid fa-hand-point-down'></i>",
                condition: !weapon.system.dropped,
                callback: () => this.actor.equipItem(weapon.id, { equipped: false, dropped: true }),
            },
            {
                name: `Un-equip ${weapon.name}`,
                icon: "<i class='fa-solid fa-shield-minus'></i>",
                condition: !weapon.system.dropped,
                callback: () => this.actor.equipItem(weapon.id, { equipped: false, dropped: false }),
            },
        ];
    }
}