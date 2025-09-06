Hooks.once('init', () => {
    game.settings.register('crucibletongs', 'enableHotBarActor', {
        name: 'crucibletongs.SETTINGS.enableHotBarActor',
        hint: 'crucibletongs.SETTINGS.enableHotBarActorHint',
        scope: 'client',
        config: true,
        default: true,
        type: Boolean,
    });
});
