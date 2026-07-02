import { render, screen } from '@testing-library/react'
import { MemoryRouter, Link } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from './Alert'
import { Avatar } from './Avatar'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card, CardFooter, CardHeader, CardTitle } from './Card'
import { Field } from './Field'
import { Input } from './Input'
import { Select } from './Select'
import { Tag } from './Tag'

describe('design system primitives smoke test', () => {
  it('renders Button variants without crashing', () => {
    render(
      <>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button loading>Loading</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled()
  })

  it('renders Button asChild wrapping a single Link without crashing', () => {
    render(
      <MemoryRouter>
        <Button asChild>
          <Link to="/providers/new">Novo prestador</Link>
        </Button>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Novo prestador' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/providers/new')
  })

  it('renders Badge and Tag', () => {
    const onRemove = vi.fn()
    render(
      <>
        <Badge tone="success">Ativo</Badge>
        <Tag onRemove={onRemove}>Removível</Tag>
      </>,
    )
    expect(screen.getByText('Ativo')).toBeInTheDocument()
    screen.getByLabelText('Remover').click()
    expect(onRemove).toHaveBeenCalled()
  })

  it('renders Alert with role=alert', () => {
    render(<Alert tone="danger">Algo deu errado</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado')
  })

  it('renders Card composition', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Título</CardTitle>
        </CardHeader>
        <p>Conteúdo</p>
        <CardFooter>
          <Button>Ação</Button>
        </CardFooter>
      </Card>,
    )
    expect(screen.getByText('Título')).toBeInTheDocument()
  })

  it('renders Field + Input', () => {
    render(
      <Field label="E-mail">
        <Input type="email" />
      </Field>,
    )
    expect(screen.getByText('E-mail')).toBeInTheDocument()
  })

  it('renders Avatar with initials fallback', () => {
    render(<Avatar name="Ana Souza" />)
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('renders Select with options', () => {
    render(
      <Select
        options={[
          { value: 'a', label: 'Opção A' },
          { value: 'b', label: 'Opção B' },
        ]}
        placeholder="Escolha"
      />,
    )
    expect(screen.getByText('Escolha')).toBeInTheDocument()
  })
})
