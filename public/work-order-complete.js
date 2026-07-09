(() => {
	function bindCompletionForm() {
		const form = document.querySelector('[data-opx-completion-form]')
		if (!form || form.__opxCompletionBound) return
		form.__opxCompletionBound = true

		const button = form.querySelector('[data-opx-submit]')
		const savingBox = document.querySelector('[data-opx-saving]')
		const successBox = document.querySelector('[data-opx-success]')
		const errorBox = document.querySelector('[data-opx-error]')
		const errorText = document.querySelector('[data-opx-error-text]')
		const existingBox = document.querySelector('[data-opx-existing]')

		function setHidden(node, hidden) {
			if (node) node.hidden = hidden
		}

		function setButtonSaving() {
			if (!button) return
			button.disabled = true
			button.classList.add('opx-submit--loading')
			button.setAttribute('aria-busy', 'true')
			button.innerHTML =
				'<span class="opx-submit-content"><span class="opx-submit-spinner" aria-hidden="true"></span>Zapisywanie...</span>'
		}

		function setButtonDone() {
			if (!button) return
			button.disabled = false
			button.classList.remove('opx-submit--loading')
			button.removeAttribute('aria-busy')
			button.textContent = button.dataset.successLabel || 'Zapisano'
		}

		function setButtonReady() {
			if (!button) return
			button.disabled = false
			button.classList.remove('opx-submit--loading')
			button.removeAttribute('aria-busy')
			button.textContent = button.dataset.defaultLabel || 'Zapisz'
		}

		function showSaving() {
			setHidden(errorBox, true)
			setHidden(successBox, true)
			setHidden(existingBox, true)
			setHidden(savingBox, false)
			setButtonSaving()
		}

		form.addEventListener('submit', async event => {
			if (form.dataset.opxSaving === '1') {
				event.preventDefault()
				return
			}

			form.dataset.opxSaving = '1'
			showSaving()

			if (!window.fetch || !window.FormData) return
			event.preventDefault()

			try {
				const response = await fetch(form.dataset.fetchAction || form.action, {
					method: 'POST',
					body: new FormData(form),
					headers: { Accept: 'application/json' },
				})
				const json = await response.json().catch(() => null)
				if (!response.ok || !json?.ok) {
					throw new Error(json?.error || 'Nie udało się zapisać formularza.')
				}

				setHidden(savingBox, true)
				setHidden(errorBox, true)
				setHidden(existingBox, true)
				setHidden(successBox, false)
				setButtonDone()
				window.scrollTo({ top: 0, behavior: 'smooth' })
			} catch (error) {
				setHidden(savingBox, true)
				setHidden(successBox, true)
				setHidden(errorBox, false)
				if (errorText) {
					errorText.textContent =
						error?.message || 'Błąd zapisu formularza.'
				}
				setButtonReady()
				window.scrollTo({ top: 0, behavior: 'smooth' })
			} finally {
				form.dataset.opxSaving = '0'
			}
		})
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bindCompletionForm, { once: true })
	} else {
		bindCompletionForm()
	}

	window.__opxBindCompletionForm = bindCompletionForm
})()
