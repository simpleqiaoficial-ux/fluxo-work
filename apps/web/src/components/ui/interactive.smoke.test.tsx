import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Breadcrumb } from './Breadcrumb'
import { Checkbox } from './Checkbox'
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from './Dropdown'
import { Switch } from './Switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'
import { Tooltip, TooltipProvider } from './Tooltip'

describe('interactive primitives smoke test', () => {
  it('renders Checkbox and Switch', () => {
    render(
      <>
        <Checkbox aria-label="Aceitar" />
        <Switch aria-label="Ativar" />
      </>,
    )
    expect(screen.getByRole('checkbox', { name: 'Aceitar' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Ativar' })).toBeInTheDocument()
  })

  it('renders Tabs and switches content', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Aba A</TabsTrigger>
          <TabsTrigger value="b">Aba B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Conteúdo A</TabsContent>
        <TabsContent value="b">Conteúdo B</TabsContent>
      </Tabs>,
    )
    expect(screen.getByText('Conteúdo A')).toBeInTheDocument()
  })

  it('renders Dropdown trigger', () => {
    render(
      <Dropdown>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownContent>
          <DropdownItem>Item 1</DropdownItem>
        </DropdownContent>
      </Dropdown>,
    )
    expect(screen.getByText('Abrir')).toBeInTheDocument()
  })

  it('renders Breadcrumb with a current (non-link) last item', () => {
    render(
      <MemoryRouter>
        <Breadcrumb items={[{ label: 'Prestadores', to: '/providers' }, { label: 'Acme LTDA' }]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Prestadores' })).toBeInTheDocument()
    expect(screen.getByText('Acme LTDA')).toBeInTheDocument()
  })

  it('renders Tooltip trigger without crashing', () => {
    render(
      <TooltipProvider>
        <Tooltip content="Dica">
          <button type="button">Alvo</button>
        </Tooltip>
      </TooltipProvider>,
    )
    expect(screen.getByRole('button', { name: 'Alvo' })).toBeInTheDocument()
  })
})
