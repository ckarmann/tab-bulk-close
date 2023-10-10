
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
            const target = e.target;
            if (target.tagName == "FILTER-BUTTON") {
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

    filter: function(object) {
        for (let filter of Object.values(this.state)) {
            if (filter) {
                const attributes = filter.attributes["attributes"].value.split(",");
                const negativeCheck = filter.attributes["check"] && filter.attributes["check"].value === "negative";
                if (negativeCheck) {
                    for (let attribute of attributes) {
                        if (object[attribute] === true) {
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
