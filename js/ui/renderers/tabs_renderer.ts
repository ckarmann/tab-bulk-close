import Filters from '../../filters.ts'
import Mustache from 'mustache'
import type { TabsViewModel } from '../../shared/contracts'
import groupTemplate from '../templates/group-template.mustache?raw'
import shortcutTemplate from '../templates/group-shortcut-template.mustache?raw'
import windowFilterTemplate from '../templates/window-filter-template.mustache?raw'

export default function renderTabsView(viewModel: TabsViewModel): void {
    const renderedGroups = Mustache.render(groupTemplate, { groups: viewModel.groups });
    const renderedShortcuts = Mustache.render(shortcutTemplate, { groups: viewModel.groups });
    const renderedWindowFilter = Mustache.render(windowFilterTemplate, { windows: viewModel.windows });

    document.getElementById('tab-groups')!.innerHTML = renderedGroups;
    document.getElementById('drop-groups-shortcuts')!.innerHTML = renderedShortcuts;

    const windowFilterControl = document.getElementById('filter-windows')!;
    windowFilterControl.innerHTML = renderedWindowFilter;
    Filters.applyFilterState(windowFilterControl);
}
