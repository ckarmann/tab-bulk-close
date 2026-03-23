import Filters from '/js/filters.js'

export default function renderTabsView(viewModel) {
    const groupTemplate = document.getElementById('group-template').innerHTML;
    const shortcutTemplate = document.getElementById('group-shortcut-template').innerHTML;
    const windowFilterTemplate = document.getElementById('window-filter-template').innerHTML;

    const renderedGroups = Mustache.render(groupTemplate, { groups: viewModel.groups });
    const renderedShortcuts = Mustache.render(shortcutTemplate, { groups: viewModel.groups });
    const renderedWindowFilter = Mustache.render(windowFilterTemplate, { windows: viewModel.windows });

    document.getElementById('tab-groups').innerHTML = renderedGroups;
    document.getElementById('drop-groups-shortcuts').innerHTML = renderedShortcuts;

    const windowFilterControl = document.getElementById('filter-windows');
    windowFilterControl.innerHTML = renderedWindowFilter;
    Filters.applyFilterState(windowFilterControl);
}