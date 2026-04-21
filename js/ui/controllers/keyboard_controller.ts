function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Control') {
        if (!document.body.classList.contains('advancedEnabled')) {
            document.body.classList.add('advancedEnabled')
        }
    }
}

function onKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Control') {
        if (document.body.classList.contains('advancedEnabled')) {
            document.body.classList.remove('advancedEnabled')
        }
    }
}

export function initKeyboardController(): void {
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
}
