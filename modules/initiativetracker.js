const { mergeObject, duplicate } = foundry.utils;

export class CrucibleCombatTracker extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static DEFAULT_OPTIONS = {
        position: {
            width: 440,
            top: 100,
            left: 170,
        },
        window: {
            title: 'crucibletongs.combatTracker',
            resizable: true,
            frame: false,
        },
        actions: {
            panToCombatant: this.#onCombatantControl,
            pingCombatant: this.#onCombatantControl,
            rollInitiative: this.#onCombatantControl,
            toggleDefeated: this.#onCombatantControl,
            toggleHidden: this.#onCombatantControl,
            activateCombatant: this.#onCombatantMouseDown,
            waitInit: this.#waitInit,
        },
        classes: ['crucible-tongs-combat-tracker', 'crucible'],
    };

    static PARTS = {
        main: {
            template: 'modules/crucibletongs/templates/combattracker/initracker.hbs',
        },
    };

    get scene() {
        return ui.combat.scene;
    }

    get viewed() {
        return ui.combat.viewed;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const container = this.element.querySelector('.dragHandler');
        new foundry.applications.ux.Draggable(this, this.element, container, this.options.resizable);

        const turns = this.element.querySelectorAll('.iniItem');
        turns.forEach(turn => {
            turn.addEventListener('pointerover', this._onCombatantHoverIn.bind(this));
            turn.addEventListener('pointerout', this._onCombatantHoverOut.bind(this));
            turn.addEventListener('dblclick', this._onCombatantMouseDown.bind(this));
        });
    }

    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);

        this._createContextMenu(this._getCrucibleIniTrackerEntryContextOptions, ".iniTrackerList .combatant", { fixed: true });

        if (!game.user.isGM) return;

        this._createContextMenu(ui.combat._getCombatContextOptions, ".encounter-context-menu", {
            eventName: "click",
            fixed: true,
            parentClassHooks: false
        });
    }

    _getCrucibleIniTrackerEntryContextOptions() {
        game.tooltip.deactivate();
        return ui.combat._getEntryContextOptions();
    }

    async _prepareContext(options) {
        const data = this.combatData;
        mergeObject(options, { position: game.settings.get('crucibletongs', 'iniTrackerPosition') });

        const itemWidth = game.settings.get('crucibletongs', 'iniTrackerSize');
        const actorCount = game.settings.get('crucibletongs', 'iniTrackerCount');

        const combatStarted = data.combat.round;
        const turnsToUse = data.turns;

        const skipDefeated = game.settings.get('core', Combat.CONFIG_SETTING).skipDefeated;

        // TODO: Refactor the following logic to use a single loop for filtering and processing turns.
        const anyActive = turnsToUse.some((x) => x.active);
        let unRolled = data.turns.some((x) => x.isOwner && !x.initiative && (!game.user.isGM || data.combat.combatants.get(x.id).isNPC));
        if (turnsToUse.length) {
            const filteredTurns = [];

            let toAdd = actorCount;
            let started = false;
            let startIndex = -1;
            let index = 0;
            let loops = 0;
            let currentRound;
            while (!(toAdd === 0 || loops === actorCount)) {
                const turn = duplicate(turnsToUse[index]);
                const combatant = data.combat.combatants.get(turn.id);
                if (started && index === startIndex) turn.css = turn.css.replace('active', '');

                if (!combatStarted || (turn.active && !started) || (!anyActive && !started)) {
                    started = true;
                    startIndex = index;
                }

                if (started && !(skipDefeated && combatant.defeated) && (game.user.isGM || !combatant.hidden)) {
                    turn.round = data.combat.round + loops;
                    if (turn.isOwner && combatant.actor) {
                        turn.maxLP = combatant.actor.resources.health.max;
                        turn.currentLP = combatant.actor.resources.health.value;
                        turn.maxM = combatant.actor.resources.morale.max;
                        turn.currentM = combatant.actor.resources.morale.value;
                        turn.defenseTooltip = this.#prepareDefenseTooltip(combatant);
                    }
                    if (currentRound && currentRound !== turn.round) turn.newRound = 'newRound';

                    currentRound = turn.round;
                    filteredTurns.push(turn);
                    toAdd--;
                }
                index++;
                if (index >= turnsToUse.length) {
                    index = 0;
                    loops++;
                }
            }
            data.turns = filteredTurns;
        }

        data.isLastRound = data.turns[1]?.newRound;

        options.position.width = itemWidth * actorCount + actorCount * 3 + 70;
        options.position.height = itemWidth + 10;

        Object.assign(data, {
            itemWidth,
            unRolled,
        });

        this.conditionalPanToCurrentCombatant(data);

        return data;
    }

    #prepareDefenseTooltip(combatant) {
        const { actor, token } = combatant;
        const lines = [`<h4>${token.name}</h4>`].concat(['physical', 'fortitude', 'willpower', 'reflex'].map(type => {
            const value = actor.defenses[type];
            const name = game.i18n.localize(`DEFENSES.${type.capitalize()}`);
            return `${name}: ${value.total}`;
        }));
        const stride = game.i18n.localize('ACTOR.FIELDS.movement.stride.label');
        const engage = game.i18n.localize('ACTOR.FIELDS.movement.engagement.labelShort');
        lines.push(`${stride}: ${actor.system.movement.stride}`);
        lines.push(`${engage}: ${actor.system.movement.engagement}`);

        return lines.join("<br>");
    }

    async conditionalPanToCurrentCombatant(data) {
        if (!game.settings.get('crucibletongs', 'enableCombatPan')) return;

        const firstTurn = data.turns[0];
        if (!firstTurn) return;

        const combatant = data.combat.combatants.get(firstTurn.id);

        if (!combatant || !this.hasChangedTurn(data)) return;

        setTimeout(() => {
            const token = combatant.token;
            if (!token || !token.object || !token.object.isVisible) return;
            canvas.animatePan({ x: token.x, y: token.y });

            if (!combatant.actor || !combatant.actor.isOwner) return;
            token.object.control({ releaseOthers: true });
        }, 300);
    }

    setPosition(position) {
        const currentPosition = super.setPosition(position);
        game.settings.set('crucibletongs', 'iniTrackerPosition', {
            left: currentPosition.left,
            top: currentPosition.top,
        });
        return currentPosition;
    }

    updateTracker(data) {
        this.combatData = data;
        this.render(true, { focus: false });
    }

    hasChangedTurn(data) {
        const res = data.turn !== this.lastTurnUpdate || data.round !== this.lastRoundUpdate;
        this.lastTurnUpdate = data.turn;
        this.lastRoundUpdate = data.round;
        return res;
    }

    static #onCombatantControl(event, target) {
        ui.combat._onCombatantControl(event, target);
    }

    static #onCombatantMouseDown(ev, target) {
        ui.combat._onCombatantMouseDown(ev, target);
    }

    static #waitInit() {
        const combatant = game.combat.combatants.get(game.combat.current.combatantId);
        combatant.actor?.useAction('delay');
    }

    _onClickAction(event, target) {
        ui.combat._onClickAction(event, target);
    }

    _onCombatantHoverOut(ev) {
        ui.combat._onCombatantHoverOut(ev);
    }

    _onCombatantHoverIn(ev) {
        ui.combat._onCombatantHoverIn(ev);
    }

    _onCombatantMouseDown(ev) {
        ui.combat._onCombatantMouseDown(ev, ev.target.closest("[data-combatant-id]"));
    }
}