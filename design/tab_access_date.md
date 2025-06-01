# Tab access date

To know when was the last time a tab was used or seen is not a simple task. If we want to enhance a tab with a date for display or filtering, we need to have a precise definition of what is an access date and how to obtain it.

At first glance, it seems simple: if you click on tab to see its content, you would expect that date/time to be the one you are considered to have accessed that time. If you stay on that page for a while, you would like that date/time to reflect that until the moment you leave the tab, or close it.

If you minify the window, or switch to another window, hiding the window with the tab, you would also consider the tab as not being accessed anymore. Things can get fuzzy though if you have two screens, or if you layout 2 windows on one screen, as multiple windows and their respective tabs could be considered in focus at the same time. Nevertheless, we could accept if one of them only is considered as "accessed" as a first approximation.

For their API for extensions developers, Chrome and Firefox added an information to each tab, a field called "lastAccessed". 
- [https://developer.chrome.com/docs/extensions/reference/api/tabs](Chrome doc) says it is defined as "The last time the tab became active in its window as the number of milliseconds since epoch."
- [For Mozilla](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab#lastaccessed), it is "Time at which the tab was last accessed, in milliseconds since the epoch"

It seems simple, but both definitions are lacking and not representative of their actual implementation.

- In Firefox: if you have multiple Windows, you will find that all of them have one tab for which the "lastAccessed" value corresponds to the current time. The active tab of each window is considered being accessed, regardless of if the window is minimized or not, in focus or not.
- In Chrome: it is not the case: windows in the background don't get their tab's lastAccessed value updated. Also even if a tab is currently active under your eyes, its lastAccessed date will not be updated. If you refresh the page or interact with it, if you follow a link, it will not be considered a new access and lastAccessed will not be updated. The value actually updates only in these circumstances:
    - Another tab was actually active, and the tab is manually activated (by clicking on it, creating a new tab, etc.);
    - The window that contained the tab was minimized and is now visible.
    - A new tab is created.
    - A closed tab was re-opened from history.
- Note that both in Firefox and Chrome, quitting the browser and restart it, with the config that old tabs should be restored at startup does NOT update the lastAccessed time of the tabs.

The behavior of Chrome is probably the most consistent, but it is still lacking for our purpose. We want to know when was the last time a tab was "used", that is, was read by a user, and a link was followed in the page and a new page was displayed in the tab. Firefox/Mozilla, on the other hand, produce a time that is mostly useless, as even tabs from invisible windows are considered as accessed as the last millisecond.

Therefore, the tabs.lastAccessed field is useless for our purpose. We have to implement our own. To do that, we have the following tools:

- events:
    - tabs.onActivated: Fires when the active tab in a window changes.
    - tabs.onCreated: Fired when a tab is created.
    - (TBD) tabs.onReplaced: Fired when a tab is replaced with another tab due to prerendering or instant.
    - tabs.onUpdated: Fired when a tab is updated. This can mean different kind of changes, not all of them being useful: audible state, discarded state, favicon URL, frozen state, group, muted state, pinned state, loading status, title, url. The ones that interest us are "url" and "loading status".
    - windows.onFocusChanged: Fired when the currently focused window changes.
    - (TBD) events of webNavigation, but needs webNavigation permissions.

With this, we could associate a tab with a date quite effectively. There are problems though with the re-opening of tabs from history as we want to preserve the time of access calculated before closing, but the tab ID will not be the same, so we would need to identify the closed tab with its last URL, with risks of collisions with another old tab with the same URL. In theory we can use "session.setTabValue()" to associate the information calculated to the tab, and use "sessions.getTabValue()" to retrieve it. Seems simple enough! But sadly not available in Chrome, ony Firefox.

In our extension we therefore define a "lastUpdatedOrAccessed" key, that we associate to a tab. It is refreshed when:
- a tab is activated (tabs.onActivated).
- a tab is created (tabs.onCreated).
- a tab has the following info updated: loading status or URL (tabs.onUpdated).
- a tab is the active tab of a window that is receiving the focus (windows.onFocusChanged).
The value is stored using "session.setTabValue". In absence of such a value, it is initialized with "tab.lastAccessed".

