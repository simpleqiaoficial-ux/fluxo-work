import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from './Modal'

describe('Modal', () => {
  it('opens on trigger click, closes on Escape, and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(
      <Modal>
        <ModalTrigger asChild>
          <button type="button">Abrir modal</button>
        </ModalTrigger>
        <ModalContent>
          <ModalTitle>Título do modal</ModalTitle>
          <p>Conteúdo</p>
        </ModalContent>
      </Modal>,
    )

    const trigger = screen.getByRole('button', { name: 'Abrir modal' })
    await user.click(trigger)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Título do modal')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
