Hooks.once('init', () => {
    const settings = {
        enableHotBarActor: {
            name: 'crucibletongs.SETTINGS.enableHotBarActor',
            hint: 'crucibletongs.SETTINGS.enableHotBarActorHint',
            scope: 'client',
            config: true,
            default: true,
            type: Boolean,
        },
        enableCombatFlow: {
            name: 'crucibletongs.SETTINGS.enableCombatFlow',
            hint: 'crucibletongs.SETTINGS.enableCombatFlowHint',
            scope: 'client',
            config: true,
            default: true,
            type: Boolean,
        },
        iniTrackerPosition: {
            name: 'iniTrackerPosition',
            scope: 'client',
            config: false,
            default: {},
            type: Object,
        },
        enableCombatPan: {
            name: 'crucibletongs.SETTINGS.enableCombatPan',
            hint: 'crucibletongs.SETTINGS.enableCombatPanHint',
            scope: 'client',
            config: true,
            default: true,
            type: Boolean,
        },
        iniTrackerSize: {
            name: 'crucibletongs.SETTINGS.iniTrackerSize',
            hint: 'crucibletongs.SETTINGS.iniTrackerSizeHint',
            scope: 'client',
            config: true,
            default: 70,
            type: Number,
            range: {
                min: 30,
                max: 140,
                step: 5,
            },
        },
        iniTrackerCount: {
            name: 'crucibletongs.SETTINGS.iniTrackerCount',
            hint: 'crucibletongs.SETTINGS.iniTrackerCountHint',
            scope: 'client',
            config: true,
            default: 5,
            type: Number,
            range: {
                min: 3,
                max: 25,
                step: 1,
            },
            onChange: async (val) => {
                if(game.combat) game.modules.get("crucibletongs").api.combatTracker.render({ force: true });
            },
        },
    };
    for (const [key, value] of Object.entries(settings)) {
        game.settings.register('crucibletongs', key, value);
    }
});
