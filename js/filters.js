
import { matchesActiveFilters } from '/js/shared/filter_state.js'

function getButtonDescriptor(target) {
    return {
        attributes: target.getAttribute("attributes"),
        check: target.getAttribute("check") || null,
        filterValue: target.getAttribute("filter-value") || null,
    };
}

function descriptorMatchesButton(descriptor, button) {
    if (!descriptor) {
        return false;
    }
    return descriptor.attributes === button.getAttribute("attributes") &&
        (descriptor.check || null) === (button.getAttribute("check") || null) &&
        (descriptor.filterValue || null) === (button.getAttribute("filter-value") || null);
}

function turnOnFilter(control, target, state) {
    console.log("turning on filter for control " + control.id + " with button " + target.outerHTML);
    const id = control.id;

    if (state[id]) {
        const previous = control.querySelector("filter-button.filter-on");
        if (previous) {
            previous.classList.remove("filter-on");
        }
    }
    state[id] = getButtonDescriptor(target);
    target.classList.add("filter-on");
}


function turnOffFilter(control, target, state) {
    console.log("turning off filter for control " + control.id);
    const id = control.id;
    target.classList.remove("filter-on");
    state[id] = null;
}

export default {
    state: {},
    init: function(refresh) {
        document.addEventListener("click", (e) => {

            // group management
            var target = e.target;
            if (target.tagName != "FILTER-BUTTON") {
                target = target.closest("filter-button");
            }

            if (target) {
                console.log("filter button clicked: " + target.outerHTML);
                const control = target.closest("filter-control");
                if (target.classList.contains("filter-on")) {
                    turnOffFilter(control, target, this.state);
                } else {
                    turnOnFilter(control, target, this.state);
                }
                refresh();
            }
        
            e.preventDefault();
        });
    },

    applyFilterState: function(control) {
        const state = this.state[control.id];

        if (state) {
            const filterButtons = control.querySelectorAll("filter-button");
            for (let button of filterButtons) {
                if (descriptorMatchesButton(state, button)) {
                    turnOnFilter(control, button, this.state);
                    return;
                }
            }
        }
    },

    filter: function(object) {
        console.log("filtering object " + JSON.stringify(object) + " with state " + JSON.stringify(this.state));
        return matchesActiveFilters(object, this.state);
    }
}
