import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { QuickAddProvider, useRegisterQuickAdd, useQuickAddAction } from '../src/contexts/QuickAddContext'
import { ModalProvider } from '../src/contexts/ModalContext'

function Screen({ label }) {
  const [open, setOpen] = useState(false)
  useRegisterQuickAdd(() => setOpen(true))
  return (
    <div>
      <span>{label}</span>
      {open && <div data-testid="form">Form Open</div>}
    </div>
  )
}

function Button() {
  const action = useQuickAddAction()
  if (!action) return null
  return <button onClick={action}>Add</button>
}

describe('QuickAddContext', () => {
  it('registers action and button opens the correct form', () => {
    render(
      <ModalProvider>
        <QuickAddProvider>
          <Screen label="Recurring" />
          <Button />
        </QuickAddProvider>
      </ModalProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('Form Open')).toBeInTheDocument()
  })
})
