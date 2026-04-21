interface DragTarget extends HTMLElement {
    dragCount?: number
}

type MoveDomainHandler = (newGroup: string, domain: string) => void | Promise<void>

function handleDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement
    target.style.opacity = '0.4'

    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData('domain', target.dataset.domain!)
}

function handleDragEnd(e: DragEvent): void {
    const target = e.target as HTMLElement
    target.style.opacity = '1'
    const boxes = document.querySelectorAll('.group-box')
    boxes.forEach((box) => {
        box.classList.remove('over')
    })
}

function handleDrop(onMoveDomain: MoveDomainHandler, e: DragEvent): false | undefined {
    e.stopPropagation() // stops the browser from redirecting.

    const target = (e.target as Element).closest('.drop-target') as HTMLElement | null
    if (target) {
        const newGroup = target.dataset.group!
        const domain = e.dataTransfer!.getData('domain')

        void onMoveDomain(newGroup, domain)

        return false
    }

    return undefined
}

function handleBoxDragOver(e: DragEvent): false {
    e.preventDefault()
    return false
}

function handleBoxDragEnter(e: DragEvent): void {
    const target = (e.target as Element).closest('.drop-target') as DragTarget | null
    if (target) {
        target.classList.add('over')
        if (target.dragCount === undefined) {
            target.dragCount = 1
        } else {
            target.dragCount++
        }
    }
}

function handleBoxDragLeave(e: DragEvent): void {
    const target = (e.target as Element).closest('.drop-target') as DragTarget | null
    if (target) {
        target.dragCount!--
        if (target.dragCount === 0) {
            target.classList.remove('over')
        }
    }
}

export function initDragDropController(onMoveDomain: MoveDomainHandler): void {
    document.addEventListener('dragover', handleBoxDragOver)
    document.addEventListener('dragenter', handleBoxDragEnter)
    document.addEventListener('dragleave', handleBoxDragLeave)
    document.addEventListener('drop', (e) => {
        handleDrop(onMoveDomain, e)
    })
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('dragend', handleDragEnd)
}
