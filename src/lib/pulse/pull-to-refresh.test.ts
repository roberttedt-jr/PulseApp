import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("Instagram-style PullToRefresh contracts", () => {
  it("enforces pull-to-refresh component architecture and styling", () => {
    const ptr = src("../../components/ui/pull-to-refresh.tsx");

    // Component export
    assert.match(ptr, /export function PullToRefresh/);

    // Indicator positioning, size, and styling
    assert.match(ptr, /data-pull-to-refresh-indicator="1"/);
    assert.match(ptr, /data-pull-to-refresh-content="1"/);
    assert.match(ptr, /fixed top-2\.5 left-1\/2 z-50/);
    assert.match(ptr, /rounded-full/);
    assert.match(ptr, /backdrop-blur-md/);
    assert.match(ptr, /shadow-float/);

    // SVG spinner / progress circle (ruedita)
    assert.match(ptr, /strokeDasharray/);
    assert.match(ptr, /strokeDashoffset/);
    assert.match(ptr, /animate-spin/);
    assert.match(ptr, /text-primary/);

    // Touch events and passive control
    assert.match(ptr, /onTouchStart/);
    assert.match(ptr, /onTouchMove/);
    assert.match(ptr, /onTouchEnd/);
    assert.match(ptr, /overscroll-y-contain/);
    assert.match(ptr, /e\.cancelable/);
    assert.match(ptr, /e\.preventDefault\(\)/);

    // Haptic feedback
    assert.match(ptr, /navigator\.vibrate/);

    // Elastic spring physics
    assert.match(ptr, /cubic-bezier/);
  });

  it("integrates PullToRefresh into Athlete Profile (/u/$username)", () => {
    const profilePage = src("../../routes/u/$username.tsx");

    assert.match(profilePage, /import \{ PullToRefresh \} from "@\/components\/ui\/pull-to-refresh"/);
    assert.match(profilePage, /<PullToRefresh/);
    assert.match(profilePage, /<\/PullToRefresh>/);
    assert.match(profilePage, /social-profile/);
    assert.match(profilePage, /refetch\(\)/);
  });

  it("integrates PullToRefresh into Account / Settings (/account)", () => {
    const accountPage = src("../../routes/account.tsx");

    assert.match(accountPage, /import \{ PullToRefresh \} from "@\/components\/ui\/pull-to-refresh"/);
    assert.match(accountPage, /<PullToRefresh/);
    assert.match(accountPage, /<\/PullToRefresh>/);
    assert.match(accountPage, /bootstrap/);
  });

  it("integrates PullToRefresh into Activity Feed (/feed)", () => {
    const feedPage = src("../../routes/feed.tsx");

    assert.match(feedPage, /import \{ PullToRefresh \} from "@\/components\/ui\/pull-to-refresh"/);
    assert.match(feedPage, /<PullToRefresh/);
    assert.match(feedPage, /<\/PullToRefresh>/);
    assert.match(feedPage, /activity-feed/);
  });

  it("integrates PullToRefresh into Own Profile (/settings)", () => {
    const settingsPage = src("../../routes/settings.tsx");

    assert.match(settingsPage, /import \{ PullToRefresh \} from "@\/components\/ui\/pull-to-refresh"/);
    assert.match(settingsPage, /<PullToRefresh/);
    assert.match(settingsPage, /<\/PullToRefresh>/);
    assert.match(settingsPage, /social-profile/);
    assert.match(settingsPage, /refetch\(\)/);
  });
});

