Hooks.once("init", () => {
    if (game.system.version != '0.8.8') return;

    crucible.CONST.ACTION.TAGS.composed.prepare = function () {
        this.usage.hasDice = true;
    }
});