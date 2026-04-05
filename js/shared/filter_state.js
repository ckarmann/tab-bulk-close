export function matchesActiveFilters(object, activeFilters = {}) {
    for (const filter of Object.values(activeFilters)) {
        if (!filter) {
            continue;
        }

        const attributes = (filter.attributes || '').split(',').filter(Boolean);
        const negativeCheck = filter.check === 'negative';
        const valueCheck = filter.filterValue !== null && filter.filterValue !== undefined
            ? String(filter.filterValue)
            : undefined;

        if (negativeCheck) {
            for (const attribute of attributes) {
                if (object[attribute] === true) {
                    return false;
                }
            }
        } else if (valueCheck !== undefined) {
            for (const attribute of attributes) {
                if (String(object[attribute]) !== valueCheck) {
                    return false;
                }
            }
        } else {
            for (const attribute of attributes) {
                if (object[attribute] !== true) {
                    return false;
                }
            }
        }
    }

    return true;
}