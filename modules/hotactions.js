export class HotActions extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static bindToHud(app, jhtml, data) {
        jhtml.querySelector('.col.left').insertAdjacentHTML('beforeend', this.actionsHud());
        const btn = jhtml.querySelector('.control-icon[data-action="actionHUD"]');
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            new HotActions(app).render(true);
            app.close({ animate: false });
        });
    }

    static actionsHud() {
        return `<button type="button" class="control-icon" data-action="actionHUD" data-tooltip="crucibletongs.selectAction"><i class="fas fa-hand-fist" width="36" height="36"></button>`;
    }

    constructor(app, target, options = {}) {
        super();
        this.document = app.object;
        const element = app.element.getBoundingClientRect();
        this.basePosition = {
            top: element.top + element.height / 2,
            left: element.left + element.width / 2
        }
    }

    static DEFAULT_OPTIONS = {
        id: "action-hud",
        actions: {
            action: this._onAction,
            quickClose: this._onQuickClose
        },
        window: {
            frame: false,
        },
        classes: ['crucibletongs-action-hud'],
    };

    static PARTS = {
        hud: {
            template: "modules/crucibletongs/templates/hud/action-hud.hbs"
        }
    };

    get actor() {
        return this.document?.actor;
    }

    static _onAction(event, target) {
        const action = target.dataset.actionId;
        game.system.api.documents.CrucibleActor.macroAction(this.actor, action);
        this.close({ animate: false });
    }

    static _onQuickClose(event, target) {
        this.close({ animate: false });
    }

    static RADIUS = 100;

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.actions = Object.values(this.actor.actions || {});
        context.radius = this.constructor.RADIUS;
        
        const maxActionsPerCircle = [10, 14, 18, 22, 26];
        
        context.actions = context.actions.map((action, index) => {
            // Find which circle this action belongs to
            let circleIndex = 0;
            let totalActionsInPreviousCircles = 0;
            
            while (circleIndex < maxActionsPerCircle.length) {
                const actionsInCurrentCircle = Math.min(
                    maxActionsPerCircle[circleIndex], 
                    context.actions.length - totalActionsInPreviousCircles
                );
                
                if (index < totalActionsInPreviousCircles + actionsInCurrentCircle) {
                    break;
                }
                
                totalActionsInPreviousCircles += actionsInCurrentCircle;
                circleIndex++;
            }
            
            const actionInCircle = index - totalActionsInPreviousCircles;
            const actionsInThisCircle = Math.min(
                maxActionsPerCircle[circleIndex], 
                context.actions.length - totalActionsInPreviousCircles
            );
            const currentRadius = context.radius * (1 + circleIndex * 0.6);
            
            const angle = (actionInCircle / actionsInThisCircle) * 2 * Math.PI - Math.PI / 2;
            const x = Math.cos(angle) * currentRadius + context.radius;
            const y = Math.sin(angle) * currentRadius + context.radius;
            
            return {
                img: action.img,
                id: action.id,
                name: action.name,
                style: `left: ${x - 25}px; top: ${y - 25}px;`
            };
        });
        
        context.actorUuid = this.actor?.uuid || '';
        context.scale = canvas.dimensions.uiScale;
        return context;
    }

    setPosition(position) {
        //const ratio = canvas.dimensions.size / 100;
        const revised = {
            /*width: 400,
            height: 400,*/
            top: this.basePosition.top - this.constructor.RADIUS,
            left: this.basePosition.left - this.constructor.RADIUS,
        }

        return super.setPosition(revised);
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        this.element.addEventListener('click', (event) => {
            if (!event.target.closest('.data-action')) {
                this.close({ animate: false });
            }
        });

        setTimeout(() => {
            this.element.querySelectorAll('.collapsed').forEach((action) => {
                action.classList.remove('collapsed');
            });
        }, 20);
    }

}