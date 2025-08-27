import { HotBarHover } from "./hotbar.js";
import { HotActions } from "./hotactions.js";

Hooks.on("renderHotbar", (bar, html) => {
    HotBarHover.bindEvents(bar, html);
});

Hooks.on('renderTokenHUD', (app, jhtml, data) => {
    HotActions.bindToHud(app, jhtml, data);
});