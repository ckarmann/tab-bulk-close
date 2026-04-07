import Filters from '../../filters.ts'
import type { TabsViewModel } from '../../shared/contracts'
import groupTemplate from '../templates/group-template.mustache?raw'
import shortcutTemplate from '../templates/group-shortcut-template.mustache?raw'
import windowFilterTemplate from '../templates/window-filter-template.mustache?raw'

declare global {
    var Mustache: { render: (template: string, data: unknown) => string }
}

export default function renderTabsView(viewModel: TabsViewModel): void {
    const renderedGroups = globalThis.Mustache.render(groupTemplate, { groups: viewModel.groups });
    const renderedShortcuts = globalThis.Mustache.render(shortcutTemplate, { groups: viewModel.groups });
    const renderedWindowFilter = globalThis.Mustache.render(windowFilterTemplate, { windows: viewModel.windows });

    document.getElementById('tab-groups')!.innerHTML = renderedGroups;
    document.getElementById('drop-groups-shortcuts')!.innerHTML = renderedShortcuts;

    const windowFilterControl = document.getElementById('filter-windows')!;
    windowFilterControl.innerHTML = renderedWindowFilter;
    Filters.applyFilterState(windowFilterControl);
}
