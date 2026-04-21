import { matchesActiveFilters } from './shared/filter_state.ts'
import type { ActiveFilters, FilterDescriptor, FilterCheck } from './shared/contracts.ts'
import logger from './shared/logger.ts'

function getButtonDescriptor(target: Element): FilterDescriptor {
    return {
        attributes: target.getAttribute("attributes") ?? '',
        check: (target.getAttribute("check") || null) as FilterCheck,
        filterValue: target.getAttribute("filter-value") || null,
    }
}

function descriptorMatchesButton(descriptor: FilterDescriptor | null | undefined, button: Element): boolean {
    if (!descriptor) {
        return false
    }
    return descriptor.attributes === button.getAttribute("attributes") &&
        (descriptor.check || null) === (button.getAttribute("check") || null) &&
        (descriptor.filterValue || null) === (button.getAttribute("filter-value") || null)
}

function turnOnFilter(control: Element, target: Element, state: ActiveFilters): void {
    logger.debug('Turning on filter', {
        controlId: (control as HTMLElement).id,
        button: (target as HTMLElement).outerHTML,
    })
    const id = (control as HTMLElement).id
    if (state[id]) {
        const previous = control.querySelector("filter-button.filter-on")
        if (previous) {
            previous.classList.remove("filter-on")
        }
    }
    state[id] = getButtonDescriptor(target)
    target.classList.add("filter-on")
}

function turnOffFilter(control: Element, target: Element, state: ActiveFilters): void {
    logger.debug('Turning off filter', { controlId: (control as HTMLElement).id })
    const id = (control as HTMLElement).id
    target.classList.remove("filter-on")
    state[id] = null
}

export default {
    state: {} as ActiveFilters,

    init(refresh: () => void): void {
        document.addEventListener("click", (e: MouseEvent) => {
            let target = e.target as Element | null
            if (target?.tagName !== "FILTER-BUTTON") {
                target = target?.closest("filter-button") ?? null
            }

            if (target) {
                logger.debug('Filter button clicked', { button: (target as HTMLElement).outerHTML })
                const control = target.closest("filter-control")
                if (target.classList.contains("filter-on")) {
                    turnOffFilter(control!, target, this.state)
                } else {
                    turnOnFilter(control!, target, this.state)
                }
                refresh()
            }

            e.preventDefault()
        })
    },

    applyFilterState(control: Element): void {
        const state = this.state[(control as HTMLElement).id]
        if (state) {
            const filterButtons = control.querySelectorAll("filter-button")
            for (const button of Array.from(filterButtons)) {
                if (descriptorMatchesButton(state, button)) {
                    turnOnFilter(control, button, this.state)
                    return
                }
            }
        }
    },

    filter(object: Record<string, unknown>): boolean {
        logger.debug('Applying filters', { object, state: this.state })
        return matchesActiveFilters(object, this.state)
    }
}
