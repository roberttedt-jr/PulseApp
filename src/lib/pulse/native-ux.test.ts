import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("Pulse 3.7 native UX contracts", () => {
  it("opens followers and following from the athlete profile", () => {
    const profile = src("../../components/pulse/athlete-profile.tsx");
    const modal = src("../../components/social/FollowListModal.tsx");
    const social = src("./social-fns.ts");
    const socialUi = src("../../components/pulse/social.tsx");
    assert.match(profile, /FollowListModal/);
    assert.match(profile, /openList\("followers"\)/);
    assert.match(profile, /openList\("following"\)/);
    assert.match(modal, /name="filter_social_list"/);
    assert.match(modal, /type="search"/);
    assert.match(modal, /autoComplete="one-time-code"/);
    assert.match(modal, /Eliminar/);
    assert.match(modal, /FollowingToggle/);
    assert.match(modal, /unfollowUser/);
    assert.match(modal, /onRemoved\(\)/);
    assert.match(modal, /SheetTitle/);
    assert.match(socialUi, /Dejar de seguir/);
    assert.match(socialUi, /Solicitado/);
    assert.match(social, /export const listFollowing/);
    assert.doesNotMatch(social, /Solo los perfiles privados pueden eliminar seguidores/);
  });

  it("assigns weekly plan via action sheet and named start CTA", () => {
    const plan = src("../../routes/plan.tsx");
    const home = src("../../routes/index.tsx");
    const fns = src("./fns.ts");
    const migration = readFileSync(new URL("../../../migrations/0014_weekly_plan_v2.sql", import.meta.url), "utf8");
    assert.match(plan, /Mis rutinas/);
    assert.match(plan, /Plantillas Pulse/);
    assert.match(plan, /Día de descanso/);
    assert.match(plan, /type: "template"/);
    assert.match(home, /Empezar \$\{data\.today\.name\}/);
    assert.match(home, /Entrenamiento libre/);
    assert.match(home, /today\?\.isRest/);
    assert.match(fns, /kind, template_key/);
    assert.match(fns, /todayIsRest/);
    assert.match(fns, /ensurePulseV10|kind === "template"/);
    assert.match(migration, /template_key/);
  });

  it("renders PulseScore glass with a 40/40/20 breakdown", () => {
    const home = src("../../routes/index.tsx");
    const widget = src("../../components/pulse/pulse-score-glass.tsx");
    const css = src("../../styles.css");
    const formulas = src("./formulas.ts");
    assert.match(home, /PulseScoreGlass/);
    assert.match(home, /scoreBreakdown/);
    assert.match(widget, /pulse-score-glass/);
    assert.match(widget, /¿Cómo se calcula\?/);
    assert.match(widget, /#FF2D55/);
    assert.match(widget, /#AF52DE/);
    assert.match(widget, /#00F0FF/);
    assert.match(widget, /strokeDasharray/);
    assert.match(widget, /Consistencia/);
    assert.match(widget, /IntersectionObserver/);
    assert.match(widget, /requestAnimationFrame/);
    assert.match(widget, /pulse-ring-progress/);
    assert.match(widget, /pulse-score-num/);
    assert.doesNotMatch(widget, /text-\[32px\]/);
    assert.match(css, /blur\(32px\) saturate\(190%\)/);
    assert.match(css, /\.pulse-score-num/);
    assert.doesNotMatch(css, /\.tab-swipe/);
    assert.match(formulas, /volumePrev3WeeksAvg/);
    assert.match(formulas, /restDaysThisWeek/);
  });

  it("swipes welcome and tutorial through FlowShell", () => {
    const welcome = src("../../routes/welcome.tsx");
    const tutorial = src("../../routes/tutorial.tsx");
    const shell = src("../../components/pulse/flow-shell.tsx");
    const pager = src("../../components/pulse/swipe-pager.tsx");
    assert.match(welcome, /pages=\{screens\}/);
    assert.match(welcome, /onStepChange=\{setStep\}/);
    assert.match(tutorial, /pages=\{screens\}/);
    assert.match(shell, /SwipePager/);
    assert.match(shell, /PagerDots/);
    assert.doesNotMatch(shell, /embla/i);
    assert.match(pager, /onTouchStart/);
    assert.match(pager, /onTouchMove/);
    assert.match(pager, /onTouchEnd/);
    assert.match(pager, /scrollSnapType/);
    assert.match(pager, /pan-x pan-y/);
  });

  it("switches main tabs from the bar without page swipe", () => {
    const app = src("../../components/layout/app-shell.tsx");
    const css = src("../../styles.css");
    const root = src("../../routes/__root.tsx");
    const gate = src("../../components/auth-gate.tsx");
    assert.doesNotMatch(app, /TabSwipe/);
    assert.match(root, /AppFrame/);
    assert.match(gate, /useHideNav/);
    assert.doesNotMatch(gate, /<AppShell/);
    assert.match(app, /data-tabbar-track/);
    assert.match(app, /data-tabbar-pill/);
    assert.match(app, /is-bubble/);
    assert.match(app, /touchmove/);
    assert.match(app, /setPointerCapture/);
    assert.match(app, /viewTransition: false/);
    assert.match(css, /pulse-tab-item\.is-bubble/);
    assert.match(css, /scale\(1\.38\)/);
    assert.match(css, /pulse-tab-in/);
  });

  it("uses anti-autofill search and iOS input ergonomics", () => {
    const search = src("../../routes/feed/search.tsx");
    const input = src("../../components/pulse/search-input.tsx");
    const numeric = src("../../components/pulse/numeric-field.tsx");
    const train = src("../../routes/train.tsx");
    const css = src("../../styles.css");
    assert.match(search, /pulse_search_query_field/);
    assert.match(input, /type="search"/);
    assert.match(input, /autoComplete = "one-time-code"/);
    assert.match(numeric, /inputMode=\{kind === "int" \? "numeric" : "decimal"\}/);
    assert.match(numeric, /scrollIntoView/);
    assert.match(train, /pulse_exercise_search_field/);
    assert.match(css, /scroll-padding-bottom: 240px/);
    assert.match(css, /-webkit-tap-highlight-color: transparent/);
    assert.match(css, /touch-action: manipulation/);
    assert.match(css, /scale\(0\.965\)/);
    assert.match(css, /\.pressable-feedback/);
    assert.match(css, /\.glass-pill/);
    assert.match(css, /rgba\(255, 45, 85, 0\.18\)/);
    assert.match(css, /pulse-logo-halo/);
  });
});
