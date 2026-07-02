import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import { Table } from './Table'

interface Row {
  name: string
  age: number
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'age', header: 'Idade' },
]

const data: Row[] = [
  { name: 'Beatriz', age: 41 },
  { name: 'Ana', age: 29 },
  { name: 'Carlos', age: 35 },
]

describe('Table', () => {
  it('renders rows and sorts by clicking a column header', async () => {
    const user = userEvent.setup()
    render(<Table data={data} columns={columns} />)

    const rowsBefore = screen.getAllByRole('row').slice(1)
    expect(within(rowsBefore[0]).getByText('Beatriz')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Nome/ }))

    const rowsAfter = screen.getAllByRole('row').slice(1)
    expect(within(rowsAfter[0]).getByText('Ana')).toBeInTheDocument()
  })

  it('shows an empty state when there is no data', () => {
    render(<Table data={[]} columns={columns} />)
    expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument()
  })

  it('shows loading skeleton rows when isLoading is true', () => {
    render(<Table data={[]} columns={columns} isLoading />)
    expect(screen.queryByText('Nenhum registro encontrado.')).not.toBeInTheDocument()
  })
})
