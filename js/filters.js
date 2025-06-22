
function turnOnFilter(control, target, state) {
    const id = control.id;
    if (state[id]) {
        state[id].classList.remove("filter-on");
    }
    state[id] = target;
    target.classList.add("filter-on");
}


function turnOffFilter(control, target, state) {
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

        const compareAttr = function(state, button, key) {
            return state.attributes[key] == button.attributes[key] ||
                state.attributes[key].value == button.attributes[key].value
        }

        if (state) {
            const filterButtons = control.querySelectorAll("filter-button");
            for (let button of filterButtons) {
                if (compareAttr(state, button, "attributes") &&
                    compareAttr(state, button, "check") &&
                    compareAttr(state, button, "filter-value")
                ) {
                    turnOnFilter(control, button, this.state);
                    return;
                }
            }
        }
    },

    filter: function(object) {
        for (let filter of Object.values(this.state)) {
            if (filter) {
                const attributes = filter.attributes["attributes"].value.split(",");
                const negativeCheck = filter.attributes["check"] && filter.attributes["check"].value === "negative";
                const valueCheck = filter.attributes["filter-value"] ? filter.attributes["filter-value"].value : undefined;
                if (negativeCheck) {
                    for (let attribute of attributes) {
                        if (object[attribute] === true) {
                            return false;
                        }
                    }  
                } else if (valueCheck) {
                    for (let attribute of attributes) {
                        if (object[attribute].toString() !== valueCheck) {
                            return false;
                        }
                    } 
                } else {
                    for (let attribute of attributes) {
                        if (object[attribute] !== true) {
                            return false;
                        }
                    }  
                }
            }
        }
        return true;
    }
}
