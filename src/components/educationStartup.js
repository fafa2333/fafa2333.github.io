// Network/worker preparation may run during the intro; main-thread WebGL
// creation and uploads wait for this handoff, never the other way around.
let finish;
export const heroIntroFinished = new Promise(resolve => { finish = resolve; });
export function finishHeroIntro() { finish(); }
